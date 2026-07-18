import { MAX_CONTRACT_TEXT_LENGTH } from "./aiService";

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export class DocumentExtractionError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DocumentExtractionError";
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
      throw new DocumentExtractionError(413, "حجم الملف كبير جداً. الحد الأقصى المسموح به هو 10 ميجابايت.");
    }

    const isPdf = input.fileType === "application/pdf" || input.fileName.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      throw new DocumentExtractionError(
        415,
        "يدعم دليل حالياً ملفات PDF النصية فقط. استخراج النص OCR من الصور والملفات الممسوحة ضوئياً غير متاح بعد؛ الصق نص العقد أو ارفع PDF قابلاً للبحث.",
      );
    }

    const encoded = input.fileBase64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    const buffer = Buffer.from(encoded, "base64");
    if (buffer.length === 0 || !buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      throw new DocumentExtractionError(422, "الملف لا يبدو ملف PDF صالحاً. تحقق من الملف وحاول مرة أخرى.");
    }

    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        text = result.text || "";
      } finally {
        await parser.destroy();
      }
    } catch (error) {
      if (error instanceof DocumentExtractionError) throw error;
      throw new DocumentExtractionError(
        422,
        "تعذر استخراج النص من ملف PDF. قد يكون الملف تالفاً أو ممسوحاً ضوئياً؛ استخدم PDF قابلاً للبحث أو الصق نص العقد.",
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
