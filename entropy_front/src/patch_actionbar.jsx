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
