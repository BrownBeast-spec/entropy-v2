const RightSidebar = () => (
  <div className="w-[320px] shrink-0 border-l border-gray-200 bg-white h-full flex flex-col relative z-10">
    <div className="px-5 h-[68px] border-b border-gray-200 flex items-center space-x-2 text-[14px] font-semibold text-gray-900 bg-white sticky top-0 z-10 shrink-0">
      <div className="text-[#4F46E5]"><icons.Sparkles /></div>
      <span className="font-display tracking-tight">Causaly Copilot</span>
    </div>
    
    <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar flex flex-col items-center justify-center -mt-10">
      <div className="w-12 h-12 rounded-full bg-[#E5E7FF] flex items-center justify-center text-[#4F46E5] mb-2">
        <icons.Sparkles />
      </div>
      <div className="text-center px-2">
        <h4 className="font-semibold text-[13.5px] text-gray-900 mb-1.5 font-display tracking-tight">Ask a biomedical question</h4>
        <p className="text-[13px] text-gray-500 leading-[1.6]">Get answers extracted directly from the knowledge graph and documents.</p>
      </div>
    </div>
    
    <div className="p-4 bg-white border-t border-gray-200 z-10 sticky bottom-0 shrink-0">
      <div className="relative rounded-full bg-white shadow-sm border border-gray-200 focus-within:border-[#4F46E5] focus-within:ring-1 focus-within:ring-[#4F46E5] transition-all">
        <input 
          type="text" 
          placeholder="Ask a follow up question"
          className="w-full pl-5 pr-11 py-3 text-[13px] outline-none placeholder:text-gray-400 bg-transparent rounded-full font-sans"
        />
        <button className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#4F46E5] text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#3730D8] transition-colors">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </div>
);
