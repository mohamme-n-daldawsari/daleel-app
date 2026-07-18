import PDFDocument from "pdfkit";
import { describe, expect, it } from "vitest";
import { extractContractText } from "./documentExtraction";

function searchablePdf(text: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.text(text);
    doc.end();
  });
}

describe("contract document extraction", () => {
  it(
    "extracts text from a searchable PDF",
    async () => {
      const source =
        "Searchable contract text with enough content to pass validation and verify reliable PDF extraction.";
      const pdf = await searchablePdf(source);
      await expect(
        extractContractText({
          fileBase64: pdf.toString("base64"),
          fileName: "contract.pdf",
          fileType: "application/pdf",
        }),
      ).resolves.toContain("Searchable contract text");
    },
    20_000,
  );

  it("rejects images with a clear OCR limitation", async () => {
    await expect(extractContractText({ fileBase64: Buffer.from("image").toString("base64"), fileName: "scan.png", fileType: "image/png" })).rejects.toMatchObject({ status: 415 });
  });

  it("rejects malformed and too-short content", async () => {
    await expect(extractContractText({ fileBase64: Buffer.from("not a pdf").toString("base64"), fileName: "bad.pdf", fileType: "application/pdf" })).rejects.toMatchObject({ status: 422 });
    await expect(extractContractText({ pastedText: "short" })).rejects.toMatchObject({ status: 422 });
  });
});
