export type ToolPermission = Readonly<
  | {
      behavior: "allow";
    }
  | {
      behavior: "deny";
      message: string;
    }
>;

export function allowTool(): ToolPermission {
  return { behavior: "allow" };
}

export function denyTool(message: string): ToolPermission {
  return { behavior: "deny", message };
}

export function isToolDenied(
  permission: ToolPermission
): permission is Extract<ToolPermission, { behavior: "deny" }> {
  return permission.behavior === "deny";
}
