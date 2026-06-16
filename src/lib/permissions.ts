// Folder-level role access (per blueprint): plan writers see 03/04/07, accountants 12.
const ROLE_FOLDERS: Record<string, string[] | null> = {
  ADMIN: null, // null = all folders
  RCIC: null,
  CASE_MANAGER: null,
  PLAN_WRITER: ["03", "04", "07"],
  ACCOUNTANT: ["12"],
};

export function folderAllowed(role: string, code: string): boolean {
  if (!(role in ROLE_FOLDERS)) return false;
  const allowed = ROLE_FOLDERS[role];
  return allowed === null || allowed.includes(code);
}
