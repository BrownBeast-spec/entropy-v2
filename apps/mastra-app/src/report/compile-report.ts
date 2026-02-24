import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type CompileFormat = "latex" | "pdf";

export interface CompileResult {
  success: boolean;
  outputPath: string;
  stderr: string;
}

/**
 * Returns the shared temp directory for entropy reports.
 * Creates it if it doesn't exist.
 */
export async function getReportTempDir(): Promise<string> {
  const dir = join(tmpdir(), "entropy-reports");
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Invokes pandoc to compile a Markdown string to either .tex or .pdf.
 *
 * Uses xelatex as the PDF engine (best Unicode support for AI-generated content).
 * Writes output to a temp file and returns the path.
 *
 * @param markdown  - Pandoc-flavored Markdown source
 * @param sessionId - Used to name the output file
 * @param format    - "latex" for .tex output, "pdf" for compiled PDF
 */
export async function compileReport(
  markdown: string,
  sessionId: string,
  format: CompileFormat,
): Promise<CompileResult> {
  const dir = await getReportTempDir();
  const ext = format === "pdf" ? ".pdf" : ".tex";
  const outputPath = join(dir, `${sessionId}${ext}`);

  const pandocArgs = [
    "--from=markdown",
    `--to=${format === "pdf" ? "pdf" : "latex"}`,
    "--standalone",
    "--pdf-engine=xelatex",
    `--output=${outputPath}`,
    // Metadata already embedded in YAML frontmatter of the markdown
  ];

  // For .tex output we don't need --pdf-engine
  if (format === "latex") {
    pandocArgs.splice(pandocArgs.indexOf("--pdf-engine=xelatex"), 1);
  }

  const { success, stderr } = await runPandoc(pandocArgs, markdown);

  return {
    success,
    outputPath,
    stderr,
  };
}

/**
 * Spawns pandoc with the given args, piping markdown to stdin.
 * Returns { success, stderr } — success is true only on exit code 0.
 */
async function runPandoc(
  args: string[],
  stdin: string,
): Promise<{ success: boolean; stderr: string }> {
  return new Promise((resolve) => {
    // Explicitly pass PATH so xelatex is discoverable when spawned from vitest
    const env = {
      ...process.env,
      PATH: `/usr/bin:/usr/local/bin${process.env.PATH ? `:${process.env.PATH}` : ""}`,
    };

    const proc = spawn("/usr/bin/pandoc", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });

    const stderrChunks: Buffer[] = [];
    proc.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    proc.on("error", (err) =>
      resolve({ success: false, stderr: `spawn error: ${err.message}` }),
    );

    proc.on("close", (code) => {
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      resolve({ success: code === 0, stderr });
    });

    proc.stdin.write(stdin, "utf8");
    proc.stdin.end();
  });
}
