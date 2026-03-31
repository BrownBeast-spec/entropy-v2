import sys

content = """import React, { useState } from 'react';

const icons = {
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>,
  ChevronLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  Share: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>,
  Bookmark: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  Sparkles: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11.5 2.5a.5.5 0 011 0v4a.5.5 0 00.5.5h4a.5.5 0 010 1h-4a.5.5 0 00-.5.5v4a.5.5 0 01-1 0v-4a.5.5 0 00-.5-.5h-4a.5.5 0 010-1h4a.5.5 0 00.5-.5v-4z"/><path d="M17.5 14.5a.5.5 0 011 0v2a.5.5 0 00.5.5h2a.5.5 0 010 1h-2a.5.5 0 00-.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 00-.5-.5h-2a.5.5 0 010-1h2a.5.5 0 00.5-.5v-2z"/><path d="M5.5 12.5a.5.5 0 011 0v1.5a.5.5 0 00.5.5H8.5a.5.5 0 010 1h-1.5a.5.5 0 00-.5.5V17.5a.5.5 0 01-1 0v-1.5a.5.5 0 00-.5-.5h-1.5a.5.5 0 010-1h1.5a.5.5 0 00.5-.5v-1.5z"/></svg>,
  Info: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  SaveFolder: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6h-6l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2z"/></svg>,
  ExternalLink: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>,
  Filter: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  MoreHorizontal: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  Square: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Send: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  Document: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
  TargetCircle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Network: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
};

const Header = ({ onHome }) => (
  <header className="flex h-[56px] items-center justify-between px-6 bg-[#171A27] text-white select-none shrink-0 z-30 relative">
    <div className="flex items-center space-x-8">
      <div 
        className="flex items-center space-x-2 cursor-pointer"
        onClick={onHome}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
           <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-semibold text-[16px] tracking-tight font-display">causaly</span>
      </div>
      <nav className="hidden md:flex items-center space-x-7 text-[13px] text-gray-300">
        <button onClick={onHome} className="hover:text-white transition-colors">Discover</button>
        <button className="hover:text-white transition-colors flex items-center space-x-1">
          <span>Bio Graph</span>
          <icons.ChevronDown />
        </button>
        <button className="hover:text-white transition-colors">Competitor Intelligence</button>
      </nav>
    </div>
    <div className="flex items-center space-x-6 text-[13px]">
      <button className="text-gray-300 hover:text-white transition-colors">My Workspaces</button>
      <div className="flex items-center space-x-2 bg-[#2D3343] px-3 py-1.5 rounded text-gray-200 cursor-pointer hover:bg-[#373E4F] transition-colors border border-gray-600/30">
        <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
        <span>Sarah</span>
        <icons.ChevronDown />
      </div>
    </div>
  </header>
);

const LandingView = ({ onSearch }) => {
  const suggestions = [
    "What are the targets for Alzheimer's disease",
    "What drugs have been repurposed for NSCLC?",
    "What are the assays to measure SOD1 in humans?"
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-[12vh] px-4 w-full bg-gradient-to-b from-[#F0F4F8] to-[#F8FAFC]">
      <div className="flex flex-col items-center mb-10">
        <h1 className="text-[32px] font-semibold text-[#0F172A] mb-3 font-display tracking-tight">Causaly Discover</h1>
        <div className="flex items-center space-x-1.5 text-gray-500 text-[13px] font-medium">
          <icons.Sparkles />
          <span>Powered by Causaly Copilot</span>
        </div>
      </div>

      <div className="w-full max-w-[850px] mb-10">
        <div className="relative shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[6px] bg-white flex items-center border border-gray-200 focus-within:border-[#4F46E5] focus-within:ring-1 focus-within:ring-[#4F46E5] transition-all h-[52px]">
          <input 
            type="text" 
            placeholder="Ask a biomedical question"
            className="w-full pl-5 pr-12 h-full text-[14.5px] outline-none rounded-[6px] placeholder:text-gray-400 font-sans"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                onSearch(e.target.value);
              }
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 max-w-[1000px]">
        {suggestions.map((s, i) => (
          <button 
            key={i} 
            onClick={() => onSearch(s)}
            className="flex items-center space-x-2.5 text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            <div className="opacity-70"><icons.Search /></div>
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ActionBar = ({ query }) => (
  <div className="bg-white border-b border-gray-200 flex items-center shadow-sm shrink-0 z-20 relative h-[72px]">
    <div className="flex w-full pl-[60px] pr-8 h-full items-center">
      {/* Search Input Box */}
      <div className="flex-1 pr-12 relative group h-full flex items-center">
        <div className="w-full max-w-[850px] relative">
          <input 
            type="text" 
            value={query || "What are the targets for Parkinson's disease expressed in microglia?"}
            readOnly
            className="w-full pl-4 pr-[100px] py-[11px] rounded-[6px] border-[1px] border-gray-200 bg-white outline-none focus:border-[#4F46E5] transition-all font-medium text-[13.5px] text-gray-800 shadow-sm font-sans"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2 text-gray-400">
            <button className="hover:text-gray-600 p-1"><icons.TargetCircle /></button>
            <button className="text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-3 py-1.5 rounded-[4px] transition-colors flex items-center justify-center w-[36px] h-[30px] border border-[#C7D2FE]">
               <icons.Search />
            </button>
          </div>
        </div>
      </div>
      
      {/* Action Buttons Aligned with Sidebar */}
      <div className="w-[380px] shrink-0 flex items-center justify-start space-x-5 text-[13px] font-medium text-[#2563EB]">
        <button className="hover:text-[#1D4ED8] transition-colors whitespace-nowrap">Advanced Search</button>
        <div className="w-px h-4 bg-gray-200"></div>
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
  </div>
);

const AIOverview = () => (
  <div className="mb-6 pt-6 px-1">
    <div className="flex items-center space-x-2 mb-4">
      <div className="text-[#101828]"><icons.Sparkles /></div>
      <span className="font-display font-semibold text-[14px] text-gray-900">AI overview</span>
      <div className="text-gray-400 cursor-pointer ml-1"><icons.Info /></div>
    </div>
    
    <div className="space-y-4 max-w-[950px]">
      <p className="font-serif italic text-[15px] leading-[1.7] text-gray-600">
        The scientific literature search reveals several key targets for Parkinson's disease (PD) expressed in microglia. These targets are involved in various pathways and mechanisms that contribute to the pathogenesis and progression of PD.
      </p>
      
      <ul className="space-y-3 pl-1 text-[13.5px] leading-[1.65] text-[#374151]">
        <li className="relative flex items-start space-x-2">
          <span className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full flex-shrink-0 mt-2"></span>
          <div>
            <strong className="font-semibold text-gray-900">Microglial Ion Channels:</strong> Ion channels such as KCa3.1 and Kv1.3 in microglia are implicated in neuroinflammation and neurodegeneration. Blocking these channels can reduce microglial activation and neurotoxicity, making them potential therapeutic targets for PD (<a href="#" className="text-[#2563EB] hover:underline">Richardson Jason R. et al., 2013</a>; <a href="#" className="text-[#2563EB] hover:underline">Skaper Stephen D., 2010</a>; <a href="#" className="text-[#2563EB] hover:underline">Sarkar Souvarish, 2022</a>).
          </div>
        </li>
        <li className="relative flex items-start space-x-2">
          <span className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full flex-shrink-0 mt-2"></span>
          <div>
            <strong className="font-semibold text-gray-900">PARK7/DJ-1:</strong> The protein DJ-1, encoded by the PARK7 gene, plays a role in protecting against oxidative stress and regulating neuroinflammation in microglia. DJ-1 deficiency is linked to early-onset PD, and targeting DJ-1 pathways may offer therapeutic benefits (<a href="#" className="text-[#2563EB] hover:underline">Lind-Holm Mogensen Frida et al., 2023</a>).
          </div>
        </li>
      </ul>
      
      <div className="mt-2">
        <button className="text-[#2563EB] font-medium text-[13px] hover:underline">Read more</button>
      </div>
      
      <div className="flex items-center space-x-3 mt-6 pt-3">
        <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-[4px] font-medium text-[13px] flex items-center space-x-1.5 transition-colors">
          <icons.SaveFolder />
          <span>Save to Workspace</span>
        </button>
        <button className="bg-[#EEF2FF] border border-[#C7D2FE] hover:bg-[#E0E7FF] text-[#2563EB] px-4 py-2 rounded-[4px] font-medium text-[13px] flex items-center space-x-1.5 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21v-9a3 3 0 0 1 3-3h9M9 12L3 6"/></svg>
          <span>Read in-depth analysis</span>
        </button>
        <button className="w-8 h-8 flex justify-center items-center text-gray-400 hover:text-gray-600 transition-colors"><icons.MoreHorizontal /></button>
      </div>
    </div>
  </div>
);

const DocumentList = ({ onSelectDoc }) => {
  const docs = [
    {
      title: "Circadian regulation of microglia function: Potential targets for treatment of Parkinson's Disease.",
      source: "MEDLINE",
      journal: "Ageing research reviews",
      date: "2024 Feb",
      authors: "Kou Liang, +10 Wang Tao",
      aiAnswer: "<strong>Microglial circadian clock</strong> targets in Parkinson's disease include cytokine release, <strong>phagocytosis</strong>, and <strong>α-synuclein processes</strong>."
    },
    {
      title: "Microglial Ion Channels as Potential Targets for Neuroprotection in Parkinson's Disease",
      source: "PubMed Central",
      journal: "Neural Plasticity",
      date: "2013 Jan",
      authors: "Richardson Jason R., Hossain Muhammad M.",
      aiAnswer: "<strong>Microglial ion channels</strong> are potential targets for neuroprotection in Parkinson's disease, aiming to reduce neuroinflammation with a holistic approach to increase quality of life."
    }
  ];

  return (
    <div className="pb-24 pt-6">
      <div className="flex items-center justify-between py-2 mb-6 px-1">
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-1.5 text-[12px] text-gray-600 bg-[#F8FAFC] border border-gray-200 px-3 py-1.5 rounded-[4px] hover:bg-gray-100 font-medium transition-colors">
            <icons.Filter />
            <span>Filters</span>
          </button>
          <button className="flex items-center space-x-1.5 text-[12px] text-gray-600 bg-[#F8FAFC] border border-gray-200 px-3 py-1.5 rounded-[4px] hover:bg-gray-100 font-medium transition-colors">
            <span>Sort: Most relevant</span>
            <icons.ChevronDown />
          </button>
        </div>
        <div className="flex items-center space-x-4 text-[12px] font-mono text-gray-500">
          <span>Showing 1-100 of 398</span>
          <div className="flex space-x-1">
            <button className="flex items-center space-x-1 text-gray-400 hover:text-gray-600 disabled:opacity-50" disabled>
              <icons.ChevronLeft /> <span>Prev</span>
            </button>
            <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900">
              <span>Next</span> <icons.ChevronRight />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex text-[11px] font-semibold text-gray-500 uppercase tracking-wide pb-3 border-b border-gray-200 px-1">
        <div className="w-10 flex"><icons.Square /></div>
        <div className="flex-[0.8] pr-8">Document</div>
        <div className="flex-[1.2] flex items-center space-x-1.5"><icons.Sparkles /><span>AI answer</span></div>
      </div>
      
      <div className="flex flex-col">
        {docs.map((doc, idx) => (
          <div key={idx} className="flex py-6 group hover:bg-[#F8FAFC] px-1 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer" onClick={() => onSelectDoc(doc)}>
            <div className="w-10 flex pt-1 text-gray-300 group-hover:text-gray-400"><icons.Square /></div>
            <div className="flex-[0.8] pr-10">
              <h3 className="text-[#2563EB] text-[13.5px] font-medium leading-[1.45] mb-2">
                {doc.title}
              </h3>
              <div className="mb-2">
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[3px] bg-[#EEF2FF] text-[#2563EB] tracking-tight">
                  {doc.source}
                </span>
              </div>
              <div className="text-[12px] text-gray-500 font-medium mb-1">
                {doc.journal}
              </div>
              <div className="text-[12px] text-gray-500 mb-3">
                {doc.date} &middot; {doc.authors}
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-gray-50 border border-gray-100 rounded text-gray-400">
                  <icons.Document />
                </div>
              </div>
            </div>
            <div className="flex-[1.2] text-[13.5px] leading-[1.65] text-[#374151] pt-1">
              <div dangerouslySetInnerHTML={{ __html: doc.aiAnswer }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MiniDendrogram = () => (
  <div className="w-full relative h-[180px] bg-white rounded-t-lg overflow-hidden flex items-center justify-center p-4">
    <svg width="220" height="140" viewBox="0 0 220 140" className="opacity-90">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C7D2FE" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      {/* Node lines from center left routing smoothly to right nodes */}
      <path d="M 20 70 C 60 70 80 15 130 15" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5"/>
      <path d="M 20 70 C 60 70 80 35 130 35" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5"/>
      <path d="M 20 70 C 60 70 80 55 130 55" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5"/>
      <path d="M 20 70 C 60 70 80 75 130 75" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5"/>
      <path d="M 20 70 C 60 70 80 95 130 95" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5"/>
      <path d="M 20 70 C 60 70 80 115 130 115" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5"/>
      <path d="M 20 70 C 60 70 80 135 130 135" fill="none" stroke="#E0E7FF" strokeWidth="1.5"/>
      
      {/* Root hub */}
      <circle cx="20" cy="70" r="3" fill="#6366F1" />
      
      {/* Leaves & Txts */}
      {[
        { y: 15, t: "SNCA" }, { y: 35, t: "LRRK2" }, { y: 55, t: "IL1B" }, 
        { y: 75, t: "TNF" }, { y: 95, t: "NLRP3" }, { y: 115, t: "PRKN" }, { y: 135, t: "TREM2" }
      ].map((item, i) => (
        <g key={i}>
          <circle cx="130" cy={item.y} r="4" fill="white" stroke="#6366F1" strokeWidth="1.5" />
          <text x="142" y={item.y+3} className="font-mono text-[10px]" fill={i===6?"#9CA3AF":"#374151"}>{item.t}</text>
        </g>
      ))}
    </svg>
  </div>
);

const RightSidebar = () => (
  <div className="w-[340px] shrink-0 border-l border-gray-200 bg-white h-full flex flex-col relative z-10">
    <div className="px-5 h-[72px] border-b border-gray-200 flex items-center space-x-2 text-[14px] font-semibold text-[#0F172A] bg-white sticky top-0 z-10 shrink-0">
      <div className="text-[#101828]"><icons.Sparkles /></div>
      <span className="font-display tracking-tight">Causaly Copilot</span>
    </div>
    
    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-white">
      {/* Causaly Bio Graph Card */}
      <div className="border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] overflow-hidden">
        <div className="flex items-center space-x-2 px-4 py-3 border-b border-[#E2E8F0]">
          <div className="text-[#4F46E5]"><icons.Network /></div>
          <span className="text-[13px] font-semibold text-[#2563EB] font-display">Causaly Bio Graph</span>
        </div>
        <MiniDendrogram />
        <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <p className="text-[12px] leading-[1.6] text-gray-500">
            <strong className="text-gray-900 font-semibold font-mono">398</strong> Targets of parkinson's disease expressed in microglia
          </p>
        </div>
      </div>
    </div>
    
    <div className="p-4 bg-white border-t border-gray-200 z-10 sticky bottom-0 shrink-0">
      <div className="relative rounded-[8px] bg-white shadow-sm border border-gray-300 focus-within:border-[#4F46E5] focus-within:ring-1 focus-within:ring-[#4F46E5] transition-all flex items-center h-[42px]">
        <input 
          type="text" 
          placeholder="Ask a follow up question"
          className="w-full pl-4 pr-10 text-[13px] outline-none placeholder:text-gray-400 bg-transparent font-sans"
        />
        <button className="absolute right-3 text-gray-400 hover:text-[#4F46E5] transition-colors bg-transparent border-none">
           <icons.Send />
        </button>
      </div>
    </div>
  </div>
);

const DocDetailsDrawer = ({ doc, onClose }) => {
  const details = {
    title: doc?.title || "Microglial ion channels: Key players in non-cell autonomous neurodegeneration",
    source: doc?.source || "PubMed Central",
    journal: doc?.journal || "Neurobiology of disease",
    date: doc?.date || "2022 Sept",
    author: doc?.authors || "Sarkar Souvarish",
    identifiers: "PMCID: PMC9617777  DOI: 10.1016/j.nbd.2022.105861",
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity cursor-pointer" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-[-4px_0_32px_rgba(0,0,0,0.12)] z-50 overflow-y-auto no-scrollbar transform transition-transform duration-300 ease-out flex flex-col">
        <div className="p-8 pb-16 flex-1 relative">
          <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors border border-gray-200">
            <icons.X />
          </button>
          <h2 className="text-[17px] font-semibold text-[#2563EB] leading-[1.35] mb-4 pr-10">
            {details.title}
          </h2>
          
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-[3px] bg-[#EEF2FF] text-[#2563EB]">
              {details.source}
            </span>
            <span className="text-[12px] text-gray-600 font-medium">{details.journal}</span>
            <span className="text-[12px] text-gray-400">&bull;</span>
            <span className="text-[12px] text-gray-600">{details.date}</span>
          </div>
          <div className="text-[12px] text-gray-500 mb-4">{details.author}</div>
          
          <div className="font-mono text-[11px] text-gray-500 mb-6">
            {details.identifiers}
          </div>

          <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-gray-200">
            <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-[4px] font-medium text-[13px] flex items-center space-x-1.5 transition-colors shadow-sm">
              <icons.SaveFolder />
              <span>Save to Workspace</span>
            </button>
            <button className="bg-white border border-[#C7D2FE] hover:bg-gray-50 text-[#2563EB] px-4 py-2 rounded-[4px] font-medium text-[13px] flex items-center space-x-1.5 transition-colors shadow-sm">
              <icons.ExternalLink />
              <span>View online</span>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-[11px] text-gray-500 tracking-[0.08em] uppercase mb-3 text-display">Abstract</h4>
              <p className="font-serif text-[15px] text-[#374151] leading-[1.75]">
                Neuroinflammation is a critical pathophysiological hallmark of neurodegenerative disorders, including Alzheimer's disease (AD), Parkinson's disease (PD), and traumatic brain injury (TBI). Microglia, the first responders of the brain, are the drivers of this neuroinflammation. Microglial activation, leading to astrocytosis and secretory factors like interleukin 1-β (IL-1β), Tumor necrosis factor-α (TNFα), nitrites, and others, have been shown to induce neurodegeneration.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-[11px] text-gray-500 tracking-[0.08em] uppercase mb-3 text-display">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {['Channels', 'Microglia', 'Neuroinflammation', 'Ion Platforms'].map(kw => (
                  <span key={kw} className="px-3 py-1 bg-[#EEF2FF] text-[#2563EB] rounded-full text-[12px] font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function App() {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query) => {
    setSearchQuery(query);
    setHasSearched(true);
  };

  const goHome = () => {
    setHasSearched(false);
    setSelectedDoc(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col antialiased">
      <Header onHome={goHome} />
      
      {!hasSearched ? (
        <LandingView onSearch={handleSearch} />
      ) : (
        <div className="flex-1 flex max-w-[1920px] w-full mx-auto overflow-hidden">
          {/* Left Column (Search + Content) */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            <ActionBar query={searchQuery} />
            
            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto pl-[60px] pr-[40px] pt-4 scroll-smooth no-scrollbar">
              <div className="max-w-[1400px]">
                <AIOverview />
                <DocumentList onSelectDoc={setSelectedDoc} />
              </div>
            </main>
          </div>
          
          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      )}

      {/* Floating Slide-out Drawer Overlay */}
      {selectedDoc && <DocDetailsDrawer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
    </div>
  );
}
"""

with open('App.jsx', 'w') as f:
    f.write(content)

print("Landing page integrated successfully.")
