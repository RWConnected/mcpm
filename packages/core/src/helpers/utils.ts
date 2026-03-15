/** Convert a value to its JSON string representation, stripping quotes */
export function asStr(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) return "";
  return json.replace(/^"|"$/g, "");
}
