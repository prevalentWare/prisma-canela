export function pascalCase(str: string): string {
  if (!str) return "";
  // Match non-alphanumeric sequences followed by a character, and uppercase the character.
  // Also uppercase the first character.
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (chr) => chr.toUpperCase());
}
