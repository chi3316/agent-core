export type FinishReason =
  | "completed"
  | "max_steps"
  | "forced_summary"
  | "model_error";

export const FinishReason = {
  Completed: "completed",
  MaxSteps: "max_steps",
  ForcedSummary: "forced_summary",
  ModelError: "model_error"
} as const satisfies Record<string, FinishReason>;
