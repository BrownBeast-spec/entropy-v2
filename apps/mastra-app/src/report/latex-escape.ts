/**
 * Escapes LaTeX special characters in a string.
 * Special characters: & % $ # _ { } ~ ^ \
 */
export function escapeLatex(text: string): string {
  // Use a two-pass approach for backslash:
  // Replace \ with a placeholder, process all other chars, then replace placeholder.
  const BACKSLASH_PLACEHOLDER = "\x00BKSL\x00";

  return text
    .replace(/\\/g, BACKSLASH_PLACEHOLDER)
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(new RegExp(BACKSLASH_PLACEHOLDER, "g"), "\\textbackslash{}");
}
