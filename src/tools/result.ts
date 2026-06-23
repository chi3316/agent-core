export type ToolMetadata = Readonly<Record<string, unknown>>;

export type ToolResult<TData = unknown> = Readonly<
  | {
      ok: true;
      data: TData;
      metadata: ToolMetadata;
    }
  | {
      ok: false;
      error: string;
      metadata: ToolMetadata;
	}
>;

export function ok<TData>(
  data: TData,
  metadata: ToolMetadata = {}
): ToolResult<TData> {
  return {
    ok: true,
    data,
    metadata
  };
}

export function err(
  error: string,
  metadata: ToolMetadata = {}
): ToolResult<never> {
  return {
    ok: false,
    error,
    metadata
  };
}
