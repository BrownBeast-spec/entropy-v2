/**
 * compile-pdf.ts
 *
 * Converts an HTML string to a PDF using Puppeteer (headless Chrome).
 * Replaces the old Pandoc + XeLaTeX pipeline.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

export interface PdfResult {
  success: boolean;
  outputPath: string;
  /** Error message, if any */
  error?: string;
}

/**
 * Returns the project-level outputs/ directory as an absolute path.
 * Computed relative to THIS FILE via import.meta.url, so it is correct
 * regardless of process.cwd() (fixes issues when called from the API server).
 *
 * File layout:
 *   <root>/apps/mastra-app/src/report/compile-pdf.ts   ← this file
 *   <root>/outputs/                                      ← target
 */
export async function getReportOutputDir(): Promise<string> {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  // Path from this file: src/report/ → src/ → mastra-app/ → apps/ → <root>/
  // That is 4 levels up from dirname(thisFile).
  const rootDir = join(thisDir, "..", "..", "..", "..");
  const outputsDir = join(rootDir, "outputs");
  try {
    await mkdir(outputsDir, { recursive: true });
    return outputsDir;
  } catch {
    const dir = join(tmpdir(), "entropy-reports");
    await mkdir(dir, { recursive: true });
    return dir;
  }
}

/**
 * Renders htmlContent to a PDF file using Puppeteer.
 *
 * @param htmlContent  - Complete, self-contained HTML document string
 * @param sessionId    - Used to name the output files (pdf + html)
 * @returns PdfResult  - success flag, output path, and any error message
 */
export async function compilePdf(
  htmlContent: string,
  sessionId: string,
): Promise<PdfResult> {
  const dir = await getReportOutputDir();
  const pdfPath = join(dir, `${sessionId}.pdf`);
  const htmlPath = join(dir, `${sessionId}.html`);

  // Always write the HTML alongside the PDF so it can be inspected / debugged.
  await writeFile(htmlPath, htmlContent, "utf8");

  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    try {
      const page = await browser.newPage();
      // Set content directly — avoids file:// URL permission issues.
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        margin: { top: "2cm", right: "2cm", bottom: "2.5cm", left: "2cm" },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:8px;color:#999;width:100%;text-align:center;padding-top:4px;">
          Drug Repurposing Dossier — Entropy Research Pipeline
        </div>`,
        footerTemplate: `<div style="font-size:8px;color:#999;width:100%;text-align:center;padding-bottom:4px;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
      });
    } finally {
      await browser.close();
    }

    console.log(`[compile-pdf] PDF written to ${pdfPath}`);
    return { success: true, outputPath: pdfPath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[compile-pdf] Puppeteer failed: ${message}`);
    return { success: false, outputPath: pdfPath, error: message };
  }
}
