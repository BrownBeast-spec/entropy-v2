/**
 * sanitize-agent-output.ts
 *
 * Strips internal reasoning/tool-use artefacts emitted by models that leak
 * chain-of-thought tokens into their text output (e.g. gpt-oss-120b).
 *
 * Patterns removed:
 *   1. `assistantfinal` — the model's "concluded answer" prefix. Everything
 *      BEFORE this token (including all `assistantcommentary` / `assistantanalysis`
 *      blocks and tool-call/tool-result JSON) is discarded; only the text that
 *      follows the last `assistantfinal` marker is kept.
 *   2. `to=functions.<name> json{…}` — inline tool-invocation lines.
 *   3. Raw MCP tool-response JSON blobs — `{"content":[{"type":"text","text":…}]}`.
 *   4. Leftover `assistantcommentary` / `assistantanalysis` prefix lines.
 *   5. Excess blank lines.
 *
 * If none of these patterns are present the original string is returned unchanged.
 */
export function sanitizeAgentOutput(raw: string): string {
  if (!raw) return raw;

  let text = raw;

  // ── Step 1: Extract the final concluded answer ──────────────────────────────
  // gpt-oss-120b wraps its final answer with the literal token "assistantfinal".
  // Everything after the LAST occurrence of that token is the clean output.
  const finalTokenRegex = /assistantfinal/gi;
  let match: RegExpExecArray | null;
  let lastFinalIdx = -1;
  while ((match = finalTokenRegex.exec(text)) !== null) {
    lastFinalIdx = match.index + match[0].length;
  }
  if (lastFinalIdx !== -1) {
    text = text.slice(lastFinalIdx);
  }

  // ── Step 2: Strip tool-invocation lines ─────────────────────────────────────
  // Pattern:  to=functions.<name> json{…}    (may span multiple lines for the JSON)
  // We match the prefix "to=functions." up to the closing brace of the JSON object.
  text = text.replace(/to=functions\.\S+\s*json\s*\{[^}]*\}/gi, "");

  // ── Step 3: Strip raw MCP tool-response JSON blobs ──────────────────────────
  // Pattern: {"content":[{"type":"text","text":"…"}]}
  // These blobs can be large; use a non-greedy match on content arrays.
  text = text.replace(
    /\{"content":\s*\[\s*\{[^}]*"type"\s*:\s*"text"[^}]*\}\s*\]\s*\}/g,
    "",
  );

  // Also strip any residual assistant* prefixes that survived step 1.
  // Strip the FULL token (including the "assistant" prefix) to avoid leaving
  // bare "assistant" fragments that chain into "assistantassistant…".
  text = text.replace(/assistant(commentary|analysis|final)\b/gi, "");

  // ── Step 4: Strip bare JSON object/array lines that look like tool results ──
  // Some responses include lines that are just raw JSON (starting with `{` or `[`)
  // and are unambiguously not prose (they contain "agent": or "content": keys).
  text = text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return true;
      // Keep the line only if it does NOT look like a tool-response payload.
      return !/"(agent|content|type|text)"/.test(trimmed);
    })
    .join("\n");

  // ── Step 5: Normalise whitespace ─────────────────────────────────────────────
  // Collapse 3+ consecutive blank lines to 2, then trim.
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}
