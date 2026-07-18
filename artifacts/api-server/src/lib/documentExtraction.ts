import { MAX_CONTRACT_TEXT_LENGTH } from "./aiService";
import { PDFParse } from "pdf-parse";

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export class DocumentExtractionError extends Error {
  constructor(
    readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DocumentExtractionError";
  }
}

type PositionedTextItem = {
  str: string;
  dir: string;
  x: number;
  width: number;
  index: number;
};

type PdfTextContentItem = {
  str?: string;
  dir?: string;
  transform?: number[];
  width?: number;
  hasEOL?: boolean;
};

type SearchablePdfPage = {
  getTextContent(options: { disableNormalization: boolean }): Promise<{
    items: PdfTextContentItem[];
  }>;
  cleanup(): void;
};

type SearchablePdfDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<SearchablePdfPage>;
};

type PdfParseDocumentLoader = {
  load(): Promise<SearchablePdfDocument>;
};

const ARABIC_CHARACTER = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/g;
const ZERO_WIDTH_LATIN_ARTIFACT = /^[A-Za-z]$/;

function joinPositionedLine(items: PositionedTextItem[]): string {
  const arabicCharacters = items.reduce(
    (count, item) => count + (item.str.match(ARABIC_CHARACTER)?.length ?? 0),
    0,
  );
  const rtl = arabicCharacters > 0 || items.some((item) => item.dir === "rtl");
  const ordered = [...items].sort((left, right) => {
    const positionDifference = rtl ? right.x - left.x : left.x - right.x;
    return Math.abs(positionDifference) > 0.5
      ? positionDifference
      : left.index - right.index;
  });

  let line = ordered[0]?.str.trim() ?? "";
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    const gap = rtl
      ? previous.x - (current.x + current.width)
      : current.x - (previous.x + previous.width);
    line += `${gap > 1.5 ? " " : ""}${current.str.trim()}`;
  }
  return line.replace(/\s+/g, " ").trim();
}

async function extractSearchablePdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    // pdf-parse keeps the PDF.js loader private in its declarations, but the
    // positioned text items are required to reconstruct mixed RTL/LTR lines.
    const document = await (
      parser as unknown as PdfParseDocumentLoader
    ).load();
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const content = await page.getTextContent({
          disableNormalization: false,
        });
        const lines: string[] = [];
        let currentLine: PositionedTextItem[] = [];
        let currentY: number | undefined;

        const flushLine = () => {
          if (!currentLine.length) return;
          const line = joinPositionedLine(currentLine);
          if (line) lines.push(line);
          currentLine = [];
          currentY = undefined;
        };

        for (const [index, rawItem] of content.items.entries()) {
          if (
            typeof rawItem.str !== "string" ||
            !rawItem.transform ||
            typeof rawItem.width !== "number"
          )
            continue;
          const text = rawItem.str.replace(/\u0000/g, "");
          const x = rawItem.transform[4];
          const y = rawItem.transform[5];
          const isPhantomLatinGlyph =
            rawItem.width <= 0.1 && ZERO_WIDTH_LATIN_ARTIFACT.test(text.trim());

          if (isPhantomLatinGlyph) continue;
          if (!text.trim()) {
            if (rawItem.hasEOL) flushLine();
            continue;
          }
          if (currentY !== undefined && Math.abs(currentY - y) > 3.5)
            flushLine();

          currentLine.push({
            str: text,
            dir: rawItem.dir ?? "ltr",
            x,
            width: rawItem.width,
            index,
          });
          currentY = y;
          if (rawItem.hasEOL) flushLine();
        }
        flushLine();
        pages.push(lines.join("\n"));
      } finally {
        page.cleanup();
      }
    }

    return pages.join("\n\n");
  } finally {
    await parser.destroy();
  }
}

function approximateBase64Bytes(value: string): number {
  const clean = value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  return Math.floor((clean.length * 3) / 4);
}

export async function extractContractText(input: {
  pastedText?: string;
  fileBase64?: string;
  fileName?: string;
  fileType?: string;
}): Promise<string> {
  let text = input.pastedText ?? "";

  if (input.fileBase64 && input.fileName) {
    if (approximateBase64Bytes(input.fileBase64) > MAX_UPLOAD_SIZE_BYTES) {
      throw new DocumentExtractionError(
        413,
        "حجم الملف كبير جداً. الحد الأقصى المسموح به هو 10 ميجابايت.",
      );
    }

    const isPdf =
      input.fileType === "application/pdf" ||
      input.fileName.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      throw new DocumentExtractionError(
        415,
        "يدعم دليل حالياً ملفات PDF النصية فقط. استخراج النص OCR من الصور والملفات الممسوحة ضوئياً غير متاح بعد؛ الصق نص العقد أو ارفع PDF قابلاً للبحث.",
      );
    }

    const encoded = input.fileBase64
      .replace(/^data:[^;]+;base64,/, "")
      .replace(/\s/g, "");
    const buffer = Buffer.from(encoded, "base64");
    if (
      buffer.length === 0 ||
      !buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))
    ) {
      throw new DocumentExtractionError(
        422,
        "الملف لا يبدو ملف PDF صالحاً. تحقق من الملف وحاول مرة أخرى.",
      );
    }

    try {
      text = await extractSearchablePdfText(buffer);
    } catch (error) {
      if (error instanceof DocumentExtractionError) throw error;
      throw new DocumentExtractionError(
        422,
        "تعذر استخراج النص من ملف PDF. قد يكون الملف تالفاً أو ممسوحاً ضوئياً؛ استخدم PDF قابلاً للبحث أو الصق نص العقد.",
        { cause: error },
      );
    }
  }

  text = text.trim();
  if (text.length < 50) {
    throw new DocumentExtractionError(
      422,
      "نص العقد قصير جداً أو لم يُعثر على نص قابل للقراءة. يلزم 50 حرفاً على الأقل؛ قد يحتاج الملف الممسوح ضوئياً إلى OCR.",
    );
  }
  if (text.length > MAX_CONTRACT_TEXT_LENGTH) {
    throw new DocumentExtractionError(
      413,
      `العقد كبير جداً للتحليل. الحد الأقصى هو ${MAX_CONTRACT_TEXT_LENGTH.toLocaleString("ar-SA")} حرف.`,
    );
  }
  return text;
}
