const ActionBar = () => (
  <div className="bg-white border-b border-gray-200 flex items-center shadow-sm shrink-0 z-20 relative h-[68px]">
    <div className="flex w-full px-8 h-full items-center">
      {/* Search Input Box */}
      <div className="flex-1 pr-12 relative group h-full flex items-center max-w-[800px]">
        <div className="w-full relative">
          <input 
            type="text" 
            value="What are the targets for Parkinson's disease expressed in microglia?"
            readOnly
            className="w-full pl-11 pr-[100px] py-2.5 rounded-md border-[1.5px] border-gray-200 bg-white outline-none focus:border-[#4F46E5] transition-all font-medium text-[13.5px] text-gray-900 shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <icons.Search />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2 text-gray-400">
            <button className="hover:text-gray-600 p-1"><icons.Info /></button>
            <div className="w-px h-4 bg-gray-200"></div>
            <button className="text-white bg-[#4F46E5] p-1.5 rounded-[4px] hover:bg-[#3730D8] transition-colors flex items-center justify-center w-[26px] h-[26px]">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Action Buttons Aligned with Sidebar */}
      <div className="flex-1 flex items-center justify-end space-x-6 text-[13px] font-medium text-[#2563EB]">
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

export default function App() {
  const [selectedDoc, setSelectedDoc] = useState(null);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col antialiased">
      <Header />
      
      {/* Main Container */}
      <div className="flex-1 flex max-w-[1920px] w-full mx-auto overflow-hidden">
        
        {/* Left Column (Search + Tabs + Content) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <ActionBar />
          
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-8 flex shrink-0">
            {['Dendrogram', 'Grid', 'Network', 'Timeline', 'Documents'].map(tab => (
              <button key={tab} className={`px-5 py-3 text-[13.5px] font-medium border-b-[2px] transition-colors -mb-[1px] font-sans ${tab === 'Documents' ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-gray-500 hover:text-[#4F46E5] hover:bg-[#EEF0FF]'}`}>
                {tab}
              </button>
            ))}
          </div>
          
          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto px-8 scroll-smooth no-scrollbar pt-2 bg-white">
            <AIOverview />
            <DocumentList onSelectDoc={setSelectedDoc} />
          </main>
        </div>
        
        {/* Right Sidebar (Fixed Structure, matches screenshot height) */}
        <RightSidebar />

      </div>

      {/* Floating Slide-out Drawer Overlay */}
      {selectedDoc && <DocDetailsDrawer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
    </div>
  );
}
