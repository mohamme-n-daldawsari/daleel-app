export type AnalysisStatus = "pending" | "processing" | "analyzed" | "failed" | string;

export function shouldReturnCachedAnalysis(status: AnalysisStatus, force: boolean): boolean {
  return status === "analyzed" && !force;
}

export function claimableAnalysisStatuses(force: boolean): string[] {
  return force ? ["pending", "analyzed", "failed"] : ["pending"];
}

export function statusAfterAnalysisFailure(previousStatus: AnalysisStatus): "analyzed" | "failed" {
  return previousStatus === "analyzed" ? "analyzed" : "failed";
}
