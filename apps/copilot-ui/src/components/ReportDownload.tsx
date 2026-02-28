"use client";

import { getReportUrl } from "@/lib/api";

interface ReportDownloadProps {
  sessionId: string;
}

export function ReportDownload({ sessionId }: ReportDownloadProps) {
  const pdfUrl = getReportUrl(sessionId);

  return (
    <div className="report-section animate-in">
      <div className="report-card">
        <div className="report-info">
          <h3>📄 Research Dossier Ready</h3>
          <p>
            Your fully cited drug repurposing report has been compiled. Download
            the PDF to review the complete analysis including evidence,
            verification, and reviewer notes.
          </p>
        </div>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
          <button className="btn-download">
            ⬇ Download PDF Report
          </button>
        </a>
      </div>
    </div>
  );
}
