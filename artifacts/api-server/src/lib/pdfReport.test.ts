import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { SAMPLE_ANALYSIS } from "./demoData";
import { createArabicContractPdf } from "./pdfReport";

describe("Arabic contract PDF", () => {
  it("creates a real multi-section PDF", async () => {
    const pdf = await createArabicContractPdf({
      ...SAMPLE_ANALYSIS,
      contractDates: SAMPLE_ANALYSIS.contractDates,
      actionPlan: SAMPLE_ANALYSIS.actionPlan,
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(15_000);

    const previewPath = process.env.DALEEL_PDF_PREVIEW;
    if (previewPath) {
      await mkdir(dirname(previewPath), { recursive: true });
      await writeFile(previewPath, pdf);
    }
  });
});
