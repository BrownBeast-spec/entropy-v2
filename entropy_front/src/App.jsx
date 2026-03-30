import { useState, useEffect } from "react";

/* ========== DESIGN SYSTEM IMPROVEMENTS ==========
 * 1. Enhanced spacing scale (8px base unit system)
 * 2. Improved typography hierarchy with better line-heights
 * 3. Better color contrast and accessibility
 * 4. Consistent component alignment and padding
 * 5. Refined visual hierarchy with proper white space
 * 6. Polished UI elements with better shadows and borders
 * 7. Rebranded to "Entropy" with updated logo and colors
 */

/* ========== MOCK DATA ========== */
const MOCK_TARGETS = [
  "SNCA",
  "LRRK2",
  "IL1B",
  "TNF",
  "NLRP3",
  "PRKN",
  "TREM2",
  "PARK7",
  "IL6",
  "NF-kappa B",
  "PINK1",
  "NR4A2",
  "TLR4",
  "TLR2",
  "GPNMB",
  "MAPT",
];

const MOCK_DOCUMENTS = [
  {
    id: 1,
    title:
      "Circadian regulation of microglia function: Potential targets for treatment of Parkinson's Disease.",
    source: "MEDLINE",
    journal: "Ageing research reviews",
    date: "2024 Feb",
    authors: ["Kou Liang", "Wang Tao"],
    aiAnswer:
      "Microglial circadian clock targets in Parkinson's disease include cytokine release, phagocytosis, and α-synuclein processes.",
    boldTerms: ["cytokine release", "phagocytosis", "α-synuclein processes"],
    abstract:
      "Neuroinflammation mediated by microglia plays a critical role in the pathophysiology of Parkinson's disease. Recent evidence suggests that circadian rhythms regulate microglial function and neuroinflammatory responses. This review examines the circadian regulation of microglia as potential therapeutic targets for Parkinson's disease, focusing on cytokine release, phagocytosis, and α-synuclein clearance processes.",
    keywords: ["Microglia", "Circadian", "Parkinson", "Neuroinflammation"],
    meshTerms: [
      "Parkinson Disease",
      "Microglia",
      "Circadian Rhythm",
      "Neuroinflammation",
    ],
  },
  {
    id: 2,
    title:
      "Microglial Ion Channels as Potential Targets for Neuroprotection in Parkinson's Disease",
    source: "PubMed Central",
    journal: "Neural Plasticity",
    date: "2013 Jan",
    authors: ["Richardson Jason R", "Hossain Muhammad M."],
    aiAnswer:
      "Microglial ion channels are potential targets for neuroprotection in Parkinson's disease, aiming to reduce neuroinflammation with a holistic approach to increase quality of life.",
    boldTerms: ["ion channels", "neuroprotection"],
    abstract:
      "Neuroinflammation is a critical pathophysiological hallmark of neurodegenerative disorders including Parkinson's disease. Microglial activation and the subsequent release of proinflammatory mediators contribute to neuronal damage. Ion channels, particularly potassium channels KCa3.1 and Kv1.3, play crucial roles in microglial activation and function. This review discusses the potential of targeting microglial ion channels as a neuroprotective strategy in Parkinson's disease.",
    keywords: ["Channels", "Microglia", "Neuroinflammation"],
    meshTerms: [
      "Alzheimer Disease",
      "Humans",
      "Inflammation",
      "Ion Channels",
      "Microglia",
      "Neurodegenerative Diseases",
      "Parkinson Disease",
      "Tumor Necrosis Factor-alpha",
    ],
  },
  {
    id: 3,
    title:
      "PARK7/DJ-1 in microglia: implications in Parkinson's disease and relevance as a therapeutic target",
    source: "PubMed Central",
    journal: "Journal of Neuroinflammation",
    date: "2023 Apr",
    authors: ["Lind-Holm Mogensen Frida", "Michelucci Alessandro"],
    aiAnswer:
      "PARK7/DJ-1 is a target in microglia for Parkinson's disease, focusing on its role in neuroinflammation and oxidative stress.",
    boldTerms: ["PARK7/DJ-1", "neuroinflammation", "oxidative stress"],
    abstract:
      "The protein DJ-1, encoded by the PARK7 gene, is a multifunctional protein involved in oxidative stress response and has been implicated in familial Parkinson's disease. Recent studies have highlighted the importance of DJ-1 in microglial function and neuroinflammation. This article reviews the role of PARK7/DJ-1 in microglia and discusses its relevance as a therapeutic target in Parkinson's disease, with emphasis on modulating neuroinflammatory responses.",
    keywords: ["PARK7", "DJ-1", "Microglia", "Parkinson"],
    meshTerms: [
      "Parkinson Disease",
      "Microglia",
      "Oxidative Stress",
      "Neuroinflammation",
    ],
  },
];

const MOCK_SAFETY = {
  cardiovascular: "green",
  nervousSystem: "green",
  liver: "red",
  endocrine: "green",
  respiratory: "amber",
  muscle: "gray",
};

const WORKSPACES = [
  { id: 1, name: "Target ID - Parkinson's disease", saved: true },
  {
    id: 2,
    name: "Target ID and Prioritization - Promising and...",
    saved: false,
  },
  { id: 3, name: "Assays used to measure SOD1 in humans", saved: false },
  { id: 4, name: "Biomarkers of disease progression in nsclc", saved: false },
];

const EXAMPLE_QUERIES = [
  "What are the targets for Alzheimer's disease",
  "What drugs have been repurposed for NSCLC?",
  "What are the assays to measure SOD1 in humans?",
];

/* ========== COMPONENTS ========== */

// Topnav Component - Enhanced with better spacing and alignment
function Topnav() {
  const [bioGraphOpen, setBioGraphOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#0B1120] h-14 border-b border-white border-opacity-10 flex items-center px-8 justify-between shadow-lg">
      <div className="flex items-center gap-10">
        {/* Entropy Logo - Redesigned with gradient */}
        <div className="flex items-center gap-3">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="text-[#4F46E5]"
          >
            <defs>
              <linearGradient
                id="entropyGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            <path
              d="M12 2 L22 12 L12 22 L2 12 Z"
              fill="url(#entropyGradient)"
              opacity="0.9"
            />
            <circle cx="12" cy="12" r="4" fill="white" opacity="0.95" />
            <circle cx="12" cy="12" r="2" fill="url(#entropyGradient)" />
          </svg>
          <span className="text-white font-semibold text-base tracking-tight">
            Entropy
          </span>
        </div>

        {/* Nav Links - Better spacing and typography */}
        <div className="flex items-center gap-8">
          <a
            href="#"
            className="text-white text-opacity-100 text-[14px] font-medium hover:text-opacity-100 transition-all duration-200"
          >
            Discover
          </a>
          <div className="relative">
            <button
              onClick={() => setBioGraphOpen(!bioGraphOpen)}
              onBlur={() => setTimeout(() => setBioGraphOpen(false), 150)}
              className="text-white text-opacity-70 text-[14px] font-medium hover:text-opacity-100 transition-all duration-200 flex items-center gap-1.5"
            >
              Bio Graph <span className="text-[11px]">▾</span>
            </button>
            {bioGraphOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl py-2 w-52 text-left border border-gray-100">
                <a
                  href="#"
                  className="block px-4 py-2.5 text-[13px] text-[#0F172A] hover:bg-[#EEF0FF] transition-colors"
                >
                  Bio Graph Explorer
                </a>
                <a
                  href="#"
                  className="block px-4 py-2.5 text-[13px] text-[#0F172A] hover:bg-[#EEF0FF] transition-colors"
                >
                  Causal Chains
                </a>
                <a
                  href="#"
                  className="block px-4 py-2.5 text-[13px] text-[#0F172A] hover:bg-[#EEF0FF] transition-colors"
                >
                  Target Landscape
                </a>
              </div>
            )}
          </div>
          <a
            href="#"
            className="text-white text-opacity-70 text-[14px] font-medium hover:text-opacity-100 transition-all duration-200"
          >
            Competitor Intelligence
          </a>
        </div>
      </div>

      {/* Right Section - Improved visual hierarchy */}
      <div className="flex items-center gap-6">
        <a
          href="#"
          className="text-white text-opacity-70 text-[14px] font-medium hover:text-opacity-100 transition-all duration-200"
        >
          My Workspaces
        </a>
        <div className="relative">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2.5 border border-white border-opacity-20 rounded-full px-4 py-1.5 hover:border-opacity-40 hover:bg-white hover:bg-opacity-5 transition-all duration-200"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#6366F1]"></span>
            <span className="text-white text-[13px] font-medium">Sarah</span>
            <span className="text-white text-[11px] text-opacity-70">▾</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

// SearchBar Component - Enhanced with better shadows and focus states
function SearchBar({ value, onChange, onSubmit, showActions = true }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="bg-white py-5 px-8 border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center gap-6">
        <div className="flex-1 relative">
          <div
            className={`flex items-center border-2 rounded-xl transition-all duration-200 ${
              isFocused
                ? "border-[#4F46E5] shadow-lg shadow-indigo-100"
                : "border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300"
            }`}
          >
            <span className="pl-5 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What are the targets for Parkinson's disease expressed in microglia?"
              className="flex-1 px-4 py-3.5 text-[14px] outline-none font-normal"
            />
            <button className="px-4 text-gray-400 hover:text-[#4F46E5] transition-colors">
              <span className="text-base">ⓘ</span>
            </button>
            <button
              onClick={onSubmit}
              className="px-5 py-3.5 text-[#4F46E5] hover:bg-[#EEF0FF] rounded-r-xl transition-colors font-medium"
            >
              Search
            </button>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-5 text-[13px]">
            <a href="#" className="text-[#4F46E5] font-medium hover:underline">
              Advanced Search
            </a>
            <span className="text-gray-200">|</span>
            <button className="text-gray-600 hover:text-[#4F46E5] flex items-center gap-2 font-medium transition-colors">
              <span>💾</span> Save search
            </button>
            <button className="text-gray-600 hover:text-[#4F46E5] flex items-center gap-2 font-medium transition-colors">
              <span>↗</span> Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ViewTabs Component - Refined with better active states
function ViewTabs({ activeTab, onChange }) {
  const tabs = ["Dendrogram", "Grid", "Network", "Timeline", "Documents"];

  return (
    <div className="bg-white border-b border-gray-100 px-8 shadow-sm">
      <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab.toLowerCase())}
            className={`relative px-6 py-3 text-[14px] font-medium rounded-t-lg transition-all duration-200 ${
              activeTab === tab.toLowerCase()
                ? "text-[#4F46E5] bg-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {tab}
            {activeTab === tab.toLowerCase() && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full"></span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ResultsCountBar Component - Better alignment and spacing
function ResultsCountBar() {
  return (
    <div className="bg-gray-50 py-4 px-8 border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2.5 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm font-medium">
            <span className="text-gray-600">⚙</span> Filters{" "}
            <span className="text-[11px] text-gray-500">▾</span>
          </button>
          <button className="flex items-center gap-2.5 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm font-medium">
            Sort: Document count{" "}
            <span className="text-[11px] text-gray-500">▾</span>
          </button>
        </div>
        <div className="flex items-center gap-5 font-mono text-gray-600 text-[13px]">
          <span className="font-medium">Showing 1–100 of 398</span>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 hover:bg-white rounded-lg transition-colors font-medium">
              ◀ Prev
            </button>
            <button className="px-3 py-1.5 hover:bg-white rounded-lg transition-colors font-medium">
              Next ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// DendrogramView Component - Improved SVG styling and animations
function DendrogramView() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimated(true), 100);
  }, []);

  const rootX = 100;
  const rootY = 350;
  const branchX = 420;
  const branchY = 350;
  const leafStartX = 560;
  const targets = MOCK_TARGETS;

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-white p-10 overflow-auto">
      <svg viewBox="0 0 900 700" className="w-full h-full drop-shadow-sm">
        {/* Root label */}
        <text
          x={rootX - 15}
          y={rootY + 5}
          className="text-[13px] fill-[#374151] font-medium"
          textAnchor="end"
        >
          Parkinson's disease
        </text>

        {/* Root to branch path */}
        <path
          d={`M ${rootX} ${rootY} C ${(rootX + branchX) / 2} ${rootY}, ${(rootX + branchX) / 2} ${branchY}, ${branchX} ${branchY}`}
          stroke="#93C5FD"
          strokeWidth="2"
          fill="none"
          className={animated ? "animate-draw-path" : ""}
          style={{
            strokeDasharray: animated ? "0" : "400",
            strokeDashoffset: animated ? "0" : "400",
            transition: "stroke-dashoffset 500ms ease-out",
          }}
        />

        {/* Branch node */}
        <circle
          cx={branchX}
          cy={branchY}
          r="7"
          fill="url(#entropyGradient)"
          className="drop-shadow"
        />
        <text
          x={branchX}
          y={branchY - 16}
          className="text-[12px] fill-[#374151] font-medium"
          textAnchor="middle"
        >
          Specific target
        </text>

        {/* Branches to leaves */}
        {targets.map((target, i) => {
          const leafY = 80 + (i * 540) / (targets.length - 1);
          const leafX = leafStartX;
          const pathLength = 200;

          return (
            <g key={target}>
              <path
                d={`M ${branchX} ${branchY} C ${(branchX + leafX) / 2} ${branchY}, ${(branchX + leafX) / 2} ${leafY}, ${leafX} ${leafY}`}
                stroke="#93C5FD"
                strokeWidth="1.5"
                fill="none"
                className={animated ? "animate-draw-path" : ""}
                style={{
                  strokeDasharray: animated ? "0" : pathLength,
                  strokeDashoffset: animated ? "0" : pathLength,
                  transition: `stroke-dashoffset 500ms ease-out ${i * 40}ms`,
                }}
              />
              <circle
                cx={leafX}
                cy={leafY}
                r="5"
                fill="white"
                stroke="#6366F1"
                strokeWidth="2"
                className="hover:fill-[#6366F1] hover:scale-150 transition-all duration-200 cursor-pointer drop-shadow-sm"
              />
              <text
                x={leafX + 14}
                y={leafY + 4}
                className="text-[13px] fill-[#0F172A] font-mono font-medium hover:fill-[#4F46E5] cursor-pointer transition-colors"
              >
                {target}
              </text>
              {i === 2 && (
                <text x={leafX + 60} y={leafY + 4} className="text-[12px]">
                  🔥
                </text>
              )}
              {i === 5 && (
                <text x={leafX + 65} y={leafY + 4} className="text-[12px]">
                  🔗
                </text>
              )}
            </g>
          );
        })}

        {/* "+ 382 more" node */}
        <text
          x={leafStartX + 14}
          y={660}
          className="text-[14px] fill-[#4F46E5] cursor-pointer hover:underline font-medium"
        >
          + 382 more
        </text>

        {/* Secondary cluster */}
        <g opacity="0.5">
          <circle
            cx={200}
            cy={580}
            r="5"
            fill="white"
            stroke="#6366F1"
            strokeWidth="2"
          />
          <text
            x={212}
            y={585}
            className="text-[12px] fill-[#374151] font-mono font-medium"
          >
            Receptors, Antigen, B-Cell
          </text>
          <text x={390} y={585} className="text-[15px] fill-[#EF4444]">
            ✖
          </text>
        </g>
      </svg>
    </div>
  );
}

// AIOverviewCard Component - Enhanced with better visual hierarchy
function AIOverviewCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[#4F46E5] text-[18px]">✦</span>
        <span className="text-[14px] font-semibold text-[#0F172A]">
          AI overview
        </span>
        <span className="text-gray-400 text-[14px]">ⓘ</span>
      </div>

      <div className="font-serif text-[15px] text-[#374151] italic leading-relaxed mb-5 space-y-4">
        <p>
          <span className="font-semibold not-italic text-[#0F172A]">
            Microglial Ion Channels:
          </span>{" "}
          Ion channels such as KCa3.1 and Kv1.3 in microglia are implicated in
          neuroinflammation and represent potential therapeutic targets in
          Parkinson's disease.
          <a
            href="#"
            className="text-[#6366F1] hover:text-[#4F46E5] underline not-italic ml-1 transition-colors"
          >
            (Richardson Jason R. et al., 2013)
          </a>
        </p>
        <p>
          <span className="font-semibold not-italic text-[#0F172A]">
            PARK7/DJ-1:
          </span>{" "}
          The protein DJ-1, encoded by the PARK7 gene, plays a role in oxidative
          stress response in microglia and has implications for Parkinson's
          disease pathology.
          <a
            href="#"
            className="text-[#6366F1] hover:text-[#4F46E5] underline not-italic ml-1 transition-colors"
          >
            (Lind-Holm Mogensen Frida et al., 2023)
          </a>
        </p>
      </div>

      <button className="text-[#4F46E5] text-[13px] font-medium hover:text-[#4338CA] mb-5 transition-colors">
        Read more ↓
      </button>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <button className="px-5 py-2.5 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white text-[13px] font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2">
          💾 Save to Workspace
        </button>
        <button className="px-5 py-2.5 border-2 border-[#4F46E5] text-[#4F46E5] text-[13px] font-medium rounded-lg hover:bg-[#EEF0FF] transition-all duration-200 flex items-center gap-2">
          ↗ Read in-depth analysis
        </button>
        <button className="px-3 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
          ···
        </button>
      </div>
    </div>
  );
}

// DocumentRow Component - Improved layout and typography
function DocumentRow({ doc, onClick }) {
  const highlightTerms = (text, terms) => {
    let result = text;
    terms.forEach((term) => {
      const regex = new RegExp(`(${term})`, "gi");
      result = result.replace(
        regex,
        '<strong class="font-semibold">$1</strong>',
      );
    });
    return result;
  };

  return (
    <div
      onClick={() => onClick(doc)}
      className="bg-white border border-gray-200 rounded-xl p-5 mb-4 hover:bg-[#FAFBFF] hover:border-[#4F46E5] hover:shadow-md cursor-pointer transition-all duration-200 grid grid-cols-2 gap-8"
    >
      {/* Left column - Document metadata */}
      <div>
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            className="mt-1.5 w-4 h-4 accent-[#4F46E5] cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1">
            <h3 className="text-[#2563EB] text-[14px] font-semibold leading-snug mb-3 hover:underline line-clamp-2">
              {doc.title}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[11px] font-medium rounded-md">
                {doc.source}
              </span>
              {doc.source === "PubMed Central" && (
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-md flex items-center gap-1">
                  📄 table extracted
                </span>
              )}
            </div>
            <div className="text-[13px] text-gray-600 font-medium mb-1">
              {doc.journal}
            </div>
            <div className="text-[12px] text-gray-500">
              {doc.date} · {doc.authors[0]}{" "}
              {doc.authors.length > 1 && `· +${doc.authors.length - 1} more`}
            </div>
            <button className="text-gray-400 text-[12px] hover:text-[#4F46E5] mt-2 transition-colors">
              ↗ Open
            </button>
          </div>
        </div>
      </div>

      {/* Right column - AI answer */}
      <div className="border-l border-gray-100 pl-6">
        <div className="flex items-start gap-3">
          <span className="text-[#4F46E5] text-[16px] mt-0.5">✦</span>
          <div
            className="text-[14px] text-[#374151] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: highlightTerms(doc.aiAnswer, doc.boldTerms),
            }}
          />
        </div>
      </div>
    </div>
  );
}

// DocumentsView Component - Better spacing and layout
function DocumentsView({ onDocumentClick }) {
  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-white p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <AIOverviewCard />
        <div className="mt-6">
          {MOCK_DOCUMENTS.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} onClick={onDocumentClick} />
          ))}
        </div>
      </div>
    </div>
  );
}

// PaperDrawer Component - Enhanced with better shadows and animations
function PaperDrawer({ doc, onClose }) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  if (!doc) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[540px] bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={onClose}
              className="float-right text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-2xl w-10 h-10 rounded-lg flex items-center justify-center transition-all"
            >
              ×
            </button>
            <h2 className="text-[18px] font-bold text-[#2563EB] mb-4 pr-12 hover:underline cursor-pointer leading-snug">
              {doc.title}
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[12px] font-medium rounded-lg">
                {doc.source}
              </span>
              <span className="text-[13px] text-gray-600 font-medium">
                {doc.journal} · {doc.date} · DOI: 10.1016/j.arr.2024
              </span>
            </div>
            <div className="text-[14px] text-gray-700 font-medium mb-6">
              {doc.authors.join(", ")}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 relative">
              <button
                onClick={() => setWorkspaceOpen(!workspaceOpen)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white text-[13px] font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                💾 Save to Workspace
              </button>
              <button className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all">
                ↗ View online
              </button>

              {/* Workspace Dropdown */}
              {workspaceOpen && (
                <div className="absolute top-full left-0 mt-3 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 z-10 overflow-hidden">
                  {WORKSPACES.map((ws) => (
                    <button
                      key={ws.id}
                      className="w-full px-5 py-3 text-left text-[13px] hover:bg-[#EEF0FF] flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-3 font-medium">
                        <span>📁</span> {ws.name}
                      </span>
                      {ws.saved && (
                        <span className="text-green-500 text-lg">✓</span>
                      )}
                    </button>
                  ))}
                  <button className="w-full px-5 py-3 text-left text-[13px] text-[#4F46E5] hover:bg-[#EEF0FF] border-t border-gray-100 font-medium transition-colors">
                    + New Workspace
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Abstract */}
          <div className="mb-8">
            <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3">
              Abstract
            </h3>
            <p className="text-[15px] font-serif text-gray-700 leading-relaxed">
              {doc.abstract}
            </p>
          </div>

          {/* Keywords */}
          <div className="mb-8">
            <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3">
              Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {doc.keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[12px] font-medium rounded-lg"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* MeSH Terms */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3">
              MeSH Terms
            </h3>
            <div className="space-y-0">
              {doc.meshTerms.map((term) => (
                <div
                  key={term}
                  className="text-[13px] text-gray-700 py-2.5 border-b border-gray-100 font-medium"
                >
                  {term}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// MiniDendrogram Component - Refined styling
function MiniDendrogram() {
  const rootX = 20;
  const rootY = 100;
  const branchX = 110;
  const leafX = 180;
  const targets = MOCK_TARGETS.slice(0, 8);

  return (
    <svg viewBox="0 0 220 200" className="w-full h-auto">
      {/* Root to branch */}
      <path
        d={`M ${rootX} ${rootY} C ${(rootX + branchX) / 2} ${rootY}, ${(rootX + branchX) / 2} ${rootY}, ${branchX} ${rootY}`}
        stroke="#93C5FD"
        strokeWidth="2"
        fill="none"
      />
      <circle cx={branchX} cy={rootY} r="5" fill="url(#entropyGradient)" />

      {/* Branches */}
      {targets.map((target, i) => {
        const leafY = 30 + (i * 140) / (targets.length - 1);
        return (
          <g key={target}>
            <path
              d={`M ${branchX} ${rootY} C ${(branchX + leafX) / 2} ${rootY}, ${(branchX + leafX) / 2} ${leafY}, ${leafX} ${leafY}`}
              stroke="#93C5FD"
              strokeWidth="1.5"
              fill="none"
            />
            <circle
              cx={leafX}
              cy={leafY}
              r="4"
              fill="white"
              stroke="#6366F1"
              strokeWidth="2"
            />
          </g>
        );
      })}
    </svg>
  );
}

// OrganSafetySVG Component - Enhanced with better colors
function OrganSafetySVG({ safety }) {
  const getColor = (status) => {
    switch (status) {
      case "green":
        return "#10B981";
      case "red":
        return "#EF4444";
      case "amber":
        return "#F59E0B";
      default:
        return "#D1D5DB";
    }
  };

  return (
    <svg viewBox="0 0 200 280" className="w-full h-auto">
      {/* Body outline */}
      <ellipse
        cx="100"
        cy="40"
        rx="22"
        ry="26"
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="2.5"
      />
      <rect
        x="68"
        y="64"
        width="64"
        height="100"
        rx="10"
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="2.5"
      />
      <line
        x1="68"
        y1="80"
        x2="38"
        y2="140"
        stroke="#E5E7EB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="132"
        y1="80"
        x2="162"
        y2="140"
        stroke="#E5E7EB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="83"
        y1="164"
        x2="68"
        y2="240"
        stroke="#E5E7EB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="117"
        y1="164"
        x2="132"
        y2="240"
        stroke="#E5E7EB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Organs with enhanced glow effects */}
      {/* Brain - Nervous System */}
      <circle
        cx="100"
        cy="48"
        r="14"
        fill={getColor(safety.nervousSystem)}
        opacity="0.8"
        filter="url(#glow)"
      />

      {/* Heart - Cardiovascular */}
      <circle
        cx="88"
        cy="110"
        r="13"
        fill={getColor(safety.cardiovascular)}
        opacity="0.8"
        filter="url(#glow)"
      />

      {/* Lungs - Respiratory */}
      <circle
        cx="78"
        cy="108"
        r="9"
        fill={getColor(safety.respiratory)}
        opacity="0.8"
        filter="url(#glow)"
        className={safety.respiratory === "amber" ? "animate-pulse-subtle" : ""}
      />
      <circle
        cx="122"
        cy="108"
        r="9"
        fill={getColor(safety.respiratory)}
        opacity="0.8"
        filter="url(#glow)"
        className={safety.respiratory === "amber" ? "animate-pulse-subtle" : ""}
      />

      {/* Liver */}
      <circle
        cx="112"
        cy="140"
        r="16"
        fill={getColor(safety.liver)}
        opacity="0.8"
        filter="url(#glow)"
        className={safety.liver === "red" ? "animate-pulse" : ""}
      />

      {/* Kidneys - Endocrine */}
      <circle
        cx="78"
        cy="160"
        r="9"
        fill={getColor(safety.endocrine)}
        opacity="0.8"
        filter="url(#glow)"
      />
      <circle
        cx="122"
        cy="160"
        r="9"
        fill={getColor(safety.endocrine)}
        opacity="0.8"
        filter="url(#glow)"
      />

      {/* Muscle */}
      <circle
        cx="48"
        cy="120"
        r="11"
        fill={getColor(safety.muscle)}
        opacity="0.8"
        filter="url(#glow)"
      />

      {/* Glow filter */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

// CopilotSidebar Component - Enhanced UI with better cards
function CopilotSidebar({ state }) {
  const [followUpQuestion, setFollowUpQuestion] = useState("");

  return (
    <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 bg-gradient-to-br from-[#EEF0FF] to-white">
        <div className="flex items-center gap-2.5">
          <span className="text-[#4F46E5] text-[18px]">✦</span>
          <h3 className="text-[14px] font-bold text-[#0F172A]">
            Entropy Copilot
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {state === "empty" ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#6366F1] flex items-center justify-center mb-5 opacity-70 shadow-lg">
              <span className="text-white text-2xl font-bold">?</span>
            </div>
            <h4 className="text-[14px] font-semibold text-[#0F172A] mb-2">
              Ask a biomedical question
            </h4>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Get a concise summary that highlights key findings in response to
              your question.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Bio Graph Widget */}
            <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-indigo-50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[12px] font-bold text-gray-700">
                  Entropy Bio Graph
                </span>
              </div>
              <MiniDendrogram />
              <p className="text-[13px] text-[#0F172A] font-semibold mt-4 mb-4 leading-snug">
                398 Targets of parkinson's disease expressed in microglia
              </p>
              <button className="w-full px-4 py-2.5 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white text-[13px] font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200">
                View Analysis
              </button>
            </div>

            {/* Safety Analysis Widget */}
            <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-red-50 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3">
                <span className="text-[12px] font-bold text-gray-700">
                  Target safety analysis
                </span>
              </div>
              <div className="space-y-2 mb-4 text-[12px]">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-700 font-medium">
                    Cardiovascular
                  </span>
                  <span className="text-green-500 text-base">🟢</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-700 font-medium">
                    Nervous System
                  </span>
                  <span className="text-green-500 text-base">🟢</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-700 font-medium">Liver</span>
                  <span className="text-red-500 text-base">🔴</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-700 font-medium">Endocrine</span>
                  <span className="text-green-500 text-base">🟢</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-700 font-medium">Respiratory</span>
                  <span className="text-amber-500 text-base">🟡</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-700 font-medium">Muscle</span>
                  <span className="text-gray-400 text-base">⚪</span>
                </div>
              </div>
              <OrganSafetySVG safety={MOCK_SAFETY} />
            </div>
          </div>
        )}
      </div>

      {/* Follow-up Input */}
      {state === "loaded" && (
        <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              placeholder="Ask a follow up question"
              className="flex-1 px-3 py-2.5 text-[13px] border-2 border-gray-200 rounded-lg outline-none focus:border-[#4F46E5] transition-colors font-medium"
            />
            <button className="text-white bg-[#4F46E5] hover:bg-[#4338CA] px-3 py-2.5 rounded-lg transition-all">
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// DiscoverHome Component - Improved hero and layout
function DiscoverHome({ onSearch }) {
  const [query, setQuery] = useState("");

  const handleExampleClick = (example) => {
    setQuery(example);
    onSearch(example);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Section - Enhanced gradients and spacing */}
      <div className="bg-gradient-to-br from-[#EEF0FF] via-[#E5E7FF] to-[#EEF0FF] py-24 px-8 relative overflow-hidden">
        {/* Background pattern - Improved */}
        <div className="absolute inset-0 opacity-[0.06]">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="node-pattern"
                x="0"
                y="0"
                width="120"
                height="120"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="30" cy="30" r="2" fill="#3730D8" />
                <circle cx="90" cy="50" r="2" fill="#3730D8" />
                <circle cx="60" cy="80" r="2" fill="#3730D8" />
                <line
                  x1="30"
                  y1="30"
                  x2="90"
                  y2="50"
                  stroke="#3730D8"
                  strokeWidth="1"
                />
                <line
                  x1="90"
                  y1="50"
                  x2="60"
                  y2="80"
                  stroke="#3730D8"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#node-pattern)" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-[40px] font-bold text-[#0F172A] mb-3 text-center tracking-tight">
            Entropy Discover
          </h1>
          <div className="flex items-center justify-center gap-2.5 mb-10">
            <span className="text-[#4F46E5] text-[18px]">✦</span>
            <p className="text-[14px] font-medium text-gray-600">
              Powered by Entropy Copilot
            </p>
          </div>

          <div className="mb-8">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={() => query && onSearch(query)}
              showActions={false}
            />
          </div>

          {/* Example Queries - Better styled */}
          <div className="flex flex-col items-center gap-3">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="flex items-center gap-2.5 text-[14px] text-[#4F46E5] hover:text-[#4338CA] hover:underline font-medium transition-all"
              >
                <span className="text-base">🔍</span> {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Start Guides - Enhanced cards */}
      <div className="max-w-7xl mx-auto py-16 px-8">
        <h2 className="text-[24px] font-bold text-[#0F172A] mb-8">
          Quick Start Guides
        </h2>
        <div className="grid grid-cols-4 gap-5">
          {[
            {
              num: 1,
              title: "Get up to speed",
              desc: "Learn the basics of Entropy Discover",
              status: "Completed",
            },
            {
              num: 2,
              title: "Search the Bio Graph",
              desc: "Find biomedical relationships",
              status: "To do",
            },
            {
              num: 3,
              title: "Analyze targets",
              desc: "Evaluate drug target potential",
              status: "To do",
            },
            {
              num: 4,
              title: "Save your work",
              desc: "Organize findings in workspaces",
              status: "To do",
            },
          ].map((guide) => (
            <div
              key={guide.num}
              className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-xl hover:-translate-y-1 hover:border-[#4F46E5] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[24px] font-bold text-[#4F46E5]">
                  {guide.num}
                </span>
                <span
                  className={`ml-auto px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                    guide.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {guide.status}
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-[#0F172A] mb-2">
                {guide.title}
              </h3>
              <p className="text-[13px] text-gray-600 mb-4 leading-relaxed">
                {guide.desc}
              </p>
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 opacity-30" />
                <span className="relative text-white text-4xl opacity-80">
                  ▶
                </span>
                <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-black bg-opacity-80 text-white text-[11px] font-bold rounded-md">
                  2:34
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity & Workspaces - Improved layout */}
      <div className="max-w-7xl mx-auto py-16 px-8 grid grid-cols-2 gap-10">
        <div>
          <h2 className="text-[22px] font-bold text-[#0F172A] mb-6">
            Your recent activity
          </h2>
          <div className="space-y-3">
            {[
              {
                query: "Targets for Parkinson's disease in microglia",
                time: "2 hours ago",
              },
              { query: "Drug repurposing for NSCLC", time: "Yesterday" },
              { query: "SOD1 assays in humans", time: "3 days ago" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:bg-[#FAFBFF] hover:border-[#4F46E5] cursor-pointer transition-all"
              >
                <p className="text-[14px] text-[#0F172A] font-medium mb-1.5 leading-snug">
                  {item.query}
                </p>
                <p className="text-[12px] text-gray-500 font-medium">
                  {item.time}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-[22px] font-bold text-[#0F172A] mb-6">
            Your Workspaces
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {WORKSPACES.slice(0, 4).map((ws) => (
              <div
                key={ws.id}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:-translate-y-1 hover:border-[#4F46E5] cursor-pointer transition-all"
              >
                <div className="text-[28px] mb-3">📁</div>
                <p className="text-[13px] text-[#0F172A] font-semibold line-clamp-2 leading-snug">
                  {ws.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== MAIN APP ========== */
export default function App() {
  const [view, setView] = useState("home");
  const [activeTab, setActiveTab] = useState("documents");
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [copilotState, setCopilotState] = useState("empty");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setView("results");
      setCopilotState("loaded");
    }, 900);
  };

  const handleDocumentClick = (doc) => {
    setSelectedDoc(doc);
    setDrawerOpen(true);
  };

  return (
    <>
      {/* Enhanced Global Styles */}
      <style>{`
        @keyframes slide-in-right {
          from { 
            transform: translateX(100%); 
            opacity: 0;
          }
          to { 
            transform: translateX(0); 
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .animate-slide-in-right {
          animation: slide-in-right 350ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-fade-in {
          animation: fade-in 250ms ease-out;
        }

        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <div className="min-h-screen flex flex-col bg-white">
        <Topnav />

        {view === "home" && <DiscoverHome onSearch={handleSearch} />}

        {view === "results" && (
          <>
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={() => handleSearch(query)}
            />
            <ViewTabs activeTab={activeTab} onChange={setActiveTab} />
            <ResultsCountBar />

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-hidden flex flex-col">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
                      <p className="text-[14px] text-gray-600 font-medium">
                        Loading results...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeTab === "dendrogram" && <DendrogramView />}
                    {activeTab === "documents" && (
                      <DocumentsView onDocumentClick={handleDocumentClick} />
                    )}
                    {activeTab === "grid" && (
                      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-white">
                        <div className="text-center">
                          <div className="text-5xl mb-4">📊</div>
                          <p className="font-medium">Grid view coming soon</p>
                        </div>
                      </div>
                    )}
                    {activeTab === "network" && (
                      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-white">
                        <div className="text-center">
                          <div className="text-5xl mb-4">🕸️</div>
                          <p className="font-medium">
                            Network view coming soon
                          </p>
                        </div>
                      </div>
                    )}
                    {activeTab === "timeline" && (
                      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-white">
                        <div className="text-center">
                          <div className="text-5xl mb-4">📅</div>
                          <p className="font-medium">
                            Timeline view coming soon
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <CopilotSidebar state={copilotState} />
            </div>
          </>
        )}

        {drawerOpen && (
          <PaperDrawer doc={selectedDoc} onClose={() => setDrawerOpen(false)} />
        )}
      </div>
    </>
  );
}
