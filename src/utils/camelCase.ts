export function camelCase(str: string): string {
  if (!str) return "";
  // Match non-alphanumeric sequences followed by a character, uppercase the character,
  // then make the first character lowercase.
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (chr) => chr.toLowerCase());
}
