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
