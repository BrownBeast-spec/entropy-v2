import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "./components/ui/navbar";
import { LandingView } from "./components/ui/animated-landing";
import { searchEntropy } from "./lib/api";

const DEFAULT_TYPES = [
  "literature",
  "preprints",
  "proteins",
  "compounds",
  "trials",
  "patents",
  "targets",
  "interactions",
];

const icons = {
  Search: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  Share: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
    </svg>
  ),
  Bookmark: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  ),
  Sparkles: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M11.5 2.5a.5.5 0 011 0v4a.5.5 0 00.5.5h4a.5.5 0 010 1h-4a.5.5 0 00-.5.5v4a.5.5 0 01-1 0v-4a.5.5 0 00-.5-.5h-4a.5.5 0 010-1h4a.5.5 0 00.5-.5v-4z" />
      <path d="M17.5 14.5a.5.5 0 011 0v2a.5.5 0 00.5.5h2a.5.5 0 010 1h-2a.5.5 0 00-.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 00-.5-.5h-2a.5.5 0 010-1h2a.5.5 0 00.5-.5v-2z" />
    </svg>
  ),
  Info: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  SaveFolder: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6h-6l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  ),
  Filter: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  MoreHorizontal: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  ),
  Send: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Alert: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10.29 3.86L1.82 18A2 2 0 003.53 21h16.94a2 2 0 001.71-3l-8.47-14.14a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const CitationLinks = ({ citations, compact = false }) => {
  if (!citations || citations.length === 0) {
    return <span className="text-[11px] text-gray-400">No citations</span>;
  }

  const visible = citations.slice(0, compact ? 2 : 4);

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((citation, index) => {
        const label = citation.label || citation.identifier || citation.source;
        if (!citation.url) {
          return (
            <span
              key={`${label}-${index}`}
              className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md"
            >
              {label}
            </span>
          );
        }

        return (
          <a
            key={`${citation.url}-${index}`}
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[#2563EB] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-2 py-0.5 rounded-md transition-colors"
          >
            {label}
          </a>
        );
      })}
    </div>
  );
};

const ActionBar = ({
  query,
  onQueryChange,
  onSubmit,
  isLoading,
  sourceErrors,
}) => (
  <div className="bg-white border-b border-gray-200 flex items-center shadow-sm shrink-0 z-20 relative h-[72px]">
    <div className="flex w-full pl-[60px] pr-8 h-full items-center">
      <div className="flex-1 pr-12 relative h-full flex items-center">
        <div className="w-full max-w-[850px] relative">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit();
              }
            }}
            placeholder="Ask a biomedical question..."
            className="w-full pl-4 pr-[110px] py-[11px] rounded-[6px] border-[1px] border-gray-200 bg-white outline-none focus:border-[#4F46E5] transition-all font-medium text-[13.5px] text-gray-800 shadow-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2 text-gray-400">
            <button
              onClick={onSubmit}
              disabled={isLoading}
              className="text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-3 py-1.5 rounded-[4px] transition-colors flex items-center justify-center w-[40px] h-[30px] border border-[#C7D2FE] disabled:opacity-50"
            >
              <icons.Search />
            </button>
          </div>
        </div>
      </div>

      <div className="w-[380px] shrink-0 flex items-center justify-start space-x-5 text-[13px] font-medium text-[#2563EB]">
        <button className="hover:text-[#1D4ED8] transition-colors whitespace-nowrap">
          Advanced Search
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <button className="flex items-center space-x-1.5 hover:text-[#1D4ED8] transition-colors whitespace-nowrap">
          <icons.Bookmark />
          <span>Save search</span>
        </button>
        <button className="flex items-center space-x-1.5 hover:text-[#1D4ED8] transition-colors whitespace-nowrap">
          <icons.Share />
          <span>Share</span>
        </button>
      </div>
    </div>

    {sourceErrors.length > 0 && (
      <div className="absolute left-[60px] bottom-1 flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
        <icons.Alert />
        <span>Some sources failed: {sourceErrors.slice(0, 2).join(", ")}</span>
      </div>
    )}
  </div>
);

const AIOverview = ({ summary }) => (
  <div className="mb-6 pt-6 px-1">
    <div className="flex items-center space-x-2 mb-4">
      <div className="text-[#101828]">
        <icons.Sparkles />
      </div>
      <span className="font-display font-semibold text-[14px] text-gray-900">
        AI overview
      </span>
      <div className="text-gray-400 cursor-pointer ml-1">
        <icons.Info />
      </div>
      <span className="text-[11px] text-gray-400 uppercase tracking-wide">
        {summary.generatedBy}
      </span>
    </div>

    <div className="space-y-4 max-w-[950px]">
      <p className="font-serif italic text-[15px] leading-[1.7] text-gray-600">
        {summary.overview}
      </p>

      <ul className="space-y-3 pl-1 text-[13.5px] leading-[1.65] text-[#374151]">
        {summary.findings.length === 0 ? (
          <li className="text-gray-500">No findings yet.</li>
        ) : (
          summary.findings.map((finding) => (
            <li
              key={finding.id}
              className="relative flex items-start space-x-2"
            >
              <span className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full flex-shrink-0 mt-2" />
              <div className="space-y-2">
                <p>{finding.claim}</p>
                <CitationLinks citations={finding.citations} compact />
              </div>
            </li>
          ))
        )}
      </ul>

      {summary.limitations ? (
        <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {summary.limitations}
        </div>
      ) : null}

      <div className="flex items-center space-x-3 mt-6 pt-3">
        <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-[4px] font-medium text-[13px] flex items-center space-x-1.5 transition-colors">
          <icons.SaveFolder />
          <span>Save to Workspace</span>
        </button>
        <button className="bg-[#EEF2FF] border border-[#C7D2FE] hover:bg-[#E0E7FF] text-[#2563EB] px-4 py-2 rounded-[4px] font-medium text-[13px] flex items-center space-x-1.5 transition-colors">
          <icons.ExternalLink />
          <span>Read in-depth analysis</span>
        </button>
      </div>
    </div>
  </div>
);

const formatMeta = (doc) => {
  const meta = doc.metadata || {};
  const journal = typeof meta.journal === "string" ? meta.journal : "";
  const year =
    typeof meta.year === "string" || typeof meta.year === "number"
      ? String(meta.year)
      : "";
  const authors = Array.isArray(meta.authors)
    ? meta.authors.join(", ")
    : typeof meta.authors === "string"
      ? meta.authors
      : "";
  return { journal, year, authors };
};

const DocumentList = ({ docs, onSelectDoc, isLoading }) => {
  if (isLoading) {
    return (
      <div className="py-10 text-sm text-gray-500">
        Searching biomedical sources...
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="py-10 text-sm text-gray-500">
        No results. Try broadening your query or reducing filters.
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6">
      <div className="flex items-center justify-between py-2 mb-6 px-1">
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-1.5 text-[12px] text-gray-600 bg-[#F8FAFC] border border-gray-200 px-3 py-1.5 rounded-[4px] hover:bg-gray-100 font-medium transition-colors">
            <icons.Filter />
            <span>Filters</span>
          </button>
        </div>
        <div className="flex items-center space-x-4 text-[12px] font-mono text-gray-500">
          <span>Showing {docs.length} evidential results</span>
        </div>
      </div>

      <div className="flex text-[11px] font-semibold text-gray-500 uppercase tracking-wide pb-3 border-b border-gray-200 px-1">
        <div className="flex-[0.9] pr-8">Document</div>
        <div className="flex-[1.1] flex items-center space-x-1.5">
          <icons.Sparkles />
          <span>Evidence summary</span>
        </div>
      </div>

      <div className="flex flex-col">
        {docs.map((doc) => {
          const meta = formatMeta(doc);

          return (
            <div
              key={`${doc.type}-${doc.id}`}
              className="flex py-6 group hover:bg-[#F8FAFC] px-1 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer"
              onClick={() => onSelectDoc(doc)}
            >
              <div className="flex-[0.9] pr-10">
                <h3 className="text-[#2563EB] text-[13.5px] font-medium leading-[1.45] mb-2">
                  {doc.title}
                </h3>
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[3px] bg-[#EEF2FF] text-[#2563EB] tracking-tight">
                    {doc.source}
                  </span>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[3px] bg-gray-100 text-gray-600 tracking-tight uppercase">
                    {doc.type}
                  </span>
                </div>
                {(meta.journal || meta.year) && (
                  <div className="text-[12px] text-gray-500 mb-1">
                    {meta.journal}
                    {meta.journal && meta.year ? " · " : ""}
                    {meta.year}
                  </div>
                )}
                {meta.authors && (
                  <div className="text-[12px] text-gray-500 mb-3 line-clamp-2">
                    {meta.authors}
                  </div>
                )}
                <CitationLinks citations={doc.citations} compact />
              </div>
              <div className="flex-[1.1] text-[13.5px] leading-[1.65] text-[#374151] pt-1">
                <p className="mb-3">{doc.description}</p>
                <div className="text-[11px] text-gray-500">
                  Click to view full sidebar summary and citations
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RightSidebar = ({ selectedDoc, selectedFinding }) => {
  const citations = selectedDoc?.citations || [];
  const meta = selectedDoc
    ? formatMeta(selectedDoc)
    : { journal: "", year: "", authors: "" };

  return (
    <div className="w-[340px] shrink-0 border-l border-gray-200 bg-white h-full flex flex-col relative z-10">
      <div className="px-5 h-[72px] border-b border-gray-200 flex items-center space-x-2 text-[14px] font-semibold text-[#0F172A] bg-white sticky top-0 z-10 shrink-0">
        <div className="text-[#101828]">
          <icons.Sparkles />
        </div>
        <span className="font-display tracking-tight">
          Evidence Summary Bar
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-white">
        {!selectedDoc ? (
          <div className="text-[13px] leading-[1.6] text-gray-500 border border-gray-200 rounded-xl p-4 bg-gray-50">
            Select any result to see a detailed summary with citations here.
          </div>
        ) : (
          <>
            <div className="border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0]">
                <h3 className="text-[13px] font-semibold text-[#2563EB] leading-[1.4]">
                  {selectedDoc.title}
                </h3>
                <div className="text-[11px] text-gray-500 mt-1">
                  {selectedDoc.source}
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <p className="text-[12px] text-gray-700 leading-[1.6]">
                  {selectedDoc.description}
                </p>
                {(meta.journal || meta.year) && (
                  <div className="text-[11px] text-gray-500">
                    {meta.journal}
                    {meta.journal && meta.year ? " · " : ""}
                    {meta.year}
                  </div>
                )}
                {meta.authors ? (
                  <div className="text-[11px] text-gray-500">
                    {meta.authors}
                  </div>
                ) : null}
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                    Citations
                  </div>
                  <CitationLinks citations={citations} />
                </div>
              </div>
            </div>

            {selectedFinding ? (
              <div className="border border-[#E2E8F0] rounded-xl bg-white p-4">
                <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                  AI claim for selected result
                </div>
                <p className="text-[13px] leading-[1.6] text-gray-700 mb-3">
                  {selectedFinding.claim}
                </p>
                <CitationLinks citations={selectedFinding.citations} compact />
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-200 z-10 sticky bottom-0 shrink-0">
        <div className="relative rounded-[8px] bg-white shadow-sm border border-gray-300 flex items-center h-[42px]">
          <input
            type="text"
            placeholder="Ask a follow up question"
            className="w-full pl-4 pr-10 text-[13px] outline-none placeholder:text-gray-400 bg-transparent"
          />
          <button className="absolute right-3 text-gray-400 hover:text-[#4F46E5] transition-colors bg-transparent border-none">
            <icons.Send />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchData, setSearchData] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const sourceErrors = useMemo(
    () => Object.keys(searchData?.errors || {}),
    [searchData],
  );

  const selectedFinding = useMemo(() => {
    if (!selectedDoc || !searchData?.summary?.findings) return null;
    return (
      searchData.summary.findings.find((finding) =>
        (finding.evidence || []).some(
          (evidence) => evidence.id === selectedDoc.id,
        ),
      ) || null
    );
  }, [searchData, selectedDoc]);

  const runSearch = async (query) => {
    const q = query.trim();
    if (!q) return;

    setHasSearched(true);
    setSearchQuery(q);
    setErrorMsg("");
    setIsLoading(true);

    try {
      const payload = await searchEntropy({
        q,
        types: DEFAULT_TYPES,
        limit: 10,
      });
      setSearchData(payload);
      setSelectedDoc(payload.results[0] || null);
    } catch (error) {
      setSearchData(null);
      setSelectedDoc(null);
      setErrorMsg(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  const goHome = () => {
    setHasSearched(false);
    setSearchQuery("");
    setErrorMsg("");
    setSearchData(null);
    setSelectedDoc(null);
  };

  const summary = searchData?.summary || {
    overview: "No summary available yet.",
    findings: [],
    limitations: "",
    generatedBy: "fallback",
  };

  const results = searchData?.results || [];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col antialiased">
      <Header onHome={goHome} />
      <AnimatePresence mode="wait">
        {!hasSearched ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col h-full w-full"
          >
            <LandingView onSearch={runSearch} />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className="flex-1 flex max-w-[1920px] w-full mx-auto overflow-hidden h-full"
          >
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
              <ActionBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onSubmit={() => runSearch(searchQuery)}
                isLoading={isLoading}
                sourceErrors={sourceErrors}
              />

              <main className="flex-1 overflow-y-auto pl-[60px] pr-[40px] pt-4 scroll-smooth no-scrollbar">
                <div className="max-w-[1400px]">
                  {errorMsg ? (
                    <div className="mt-6 mb-4 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                      {errorMsg}
                    </div>
                  ) : null}
                  <AIOverview summary={summary} />
                  <DocumentList
                    docs={results}
                    onSelectDoc={setSelectedDoc}
                    isLoading={isLoading}
                  />
                </div>
              </main>
            </div>

            <RightSidebar
              selectedDoc={selectedDoc}
              selectedFinding={selectedFinding}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
