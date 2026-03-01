"use client";

import { motion } from "framer-motion";
import { FileDown, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReportUrl } from "@/lib/api";

interface ReportDownloadProps {
  sessionId: string;
}

export function ReportDownload({ sessionId }: ReportDownloadProps) {
  const pdfUrl = getReportUrl(sessionId);

  return (
    <motion.div
      className="mb-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.65, 0.3, 0.9] }}
    >
      <div className="rounded-lg border border-border-default bg-bg-card/80 backdrop-blur-xl overflow-hidden">
        {/* Accent top border */}
        <div className="h-0.5 bg-gradient-to-r from-accent-success via-[#69db7c] to-accent-success" />

        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-success/10 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck className="w-4 h-4 text-[#69db7c]" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-text-primary mb-0.5">
                Research Dossier Ready
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Your fully cited drug repurposing report has been compiled.
                Download the PDF to review the complete analysis including
                evidence, verification, and reviewer notes.
              </p>
            </div>
          </div>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium",
                "bg-accent text-white whitespace-nowrap transition-opacity hover:opacity-85",
              )}
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </motion.button>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
