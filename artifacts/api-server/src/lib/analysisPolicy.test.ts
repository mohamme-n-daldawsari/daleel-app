import { describe, expect, it } from "vitest";
import {
  claimableAnalysisStatuses,
  shouldReturnCachedAnalysis,
  statusAfterAnalysisFailure,
} from "./analysisPolicy";

describe("analysis request policy", () => {
  it("reuses a completed analysis unless a paid rerun is explicit", () => {
    expect(shouldReturnCachedAnalysis("analyzed", false)).toBe(true);
    expect(shouldReturnCachedAnalysis("analyzed", true)).toBe(false);
  });

  it("only permits analyzed and failed rows to be claimed for forced reruns", () => {
    expect(claimableAnalysisStatuses(false)).toEqual(["pending"]);
    expect(claimableAnalysisStatuses(true)).toEqual(["pending", "analyzed", "failed"]);
  });

  it("preserves a saved analysis when re-analysis fails", () => {
    expect(statusAfterAnalysisFailure("analyzed")).toBe("analyzed");
    expect(statusAfterAnalysisFailure("processing")).toBe("failed");
  });
});
