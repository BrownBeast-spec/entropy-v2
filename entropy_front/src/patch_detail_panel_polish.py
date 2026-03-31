import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

# Exact extract of the DocumentDetailPanel component
start_idx = content.find("const DocumentDetailPanel = ({ doc, onClose }) => {")
end_idx = content.find("export default function App() {")

old_panel = content[start_idx:end_idx]

# Let's craft the highly polished version of the panel
new_panel = """const DocumentDetailPanel = ({ doc, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!doc) return null;

  return (
    <motion.div className="absolute inset-0 z-50 overflow-hidden" 
      initial={{ opacity: 1 }} 
      exit={{ opacity: 0, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }}>
      
      {/* Subtle backdrop blur + fade */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="absolute inset-0 bg-[#0F172A]/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      
      {/* Sliding Drawer */}
      <motion.div
        initial={{ x: '100%', opacity: 0.5, boxShadow: "0px 0px 0px rgba(0,0,0,0)" }}
        animate={{ x: 0, opacity: 1, boxShadow: "-12px 0px 40px rgba(0,0,0,0.08)" }}
        exit={{ x: '100%', opacity: 0.5, boxShadow: "0px 0px 0px rgba(0,0,0,0)" }}
        transition={{ type: "spring", damping: 28, stiffness: 220, opacity: { duration: 0.2 } }}
        className="absolute right-0 top-0 bottom-0 w-[45%] min-w-[550px] max-w-[800px] bg-white rounded-l-2xl z-50 overflow-y-auto flex flex-col border-l border-gray-200/60"
      >
        <div className="flex-1 px-10 py-10">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <icons.XClose />
          </button>
          
          <h2 className="text-[20px] font-semibold text-[#2563EB] pr-12 mb-3 leading-[1.35] tracking-tight">
            {doc.title}
          </h2>
          
          <div className="mb-6 space-y-1.5 flex flex-col antialiased">
            <span className="text-[12.5px] font-bold text-[#111827] tracking-tight">{doc.source}</span>
            <span className="text-[13px] font-medium text-[#475569]">{doc.journal}</span>
            <span className="text-[13px] text-[#475569]">{doc.date} &middot; {doc.authors}</span>
            {doc.pmcid && (
              <span className="text-[12.5px] text-[#9CA3AF] mt-1 font-mono tracking-tight flex items-center gap-3">
                <span>PMCID: {doc.pmcid}</span> 
                <span className="text-gray-300">|</span> 
                <span>DOI: {doc.doi}</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3 mb-8">
            <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 rounded-[6px] text-[13px] font-medium flex items-center space-x-2 transition-all shadow-[0_1px_2px_rgba(37,99,235,0.2)] active:scale-[0.98]">
              <icons.SaveIcon />
              <span>Save to Workspace</span>
            </button>
            <button className="bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#2563EB] px-4 py-2.5 rounded-[6px] text-[13px] font-medium flex items-center space-x-2 transition-all active:scale-[0.98]">
              <icons.ExternalLink />
              <span>View online</span>
            </button>
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-gray-200 to-transparent mb-8" />
          
          <div className="mb-8 pl-1">
            <h3 className="text-[13.5px] font-bold text-[#111827] mb-2.5 font-display tracking-tight">Abstract</h3>
            <p className="text-[13.5px] text-[#334155] leading-[1.65] font-sans antialiased text-left pr-2">
              {doc.abstract || "Abstract not available for this document."}
            </p>
          </div>
          
          {doc.keywords && (
            <div className="mb-8 pl-1 font-sans text-[13px] text-[#334155] leading-relaxed">
              <span className="font-bold text-[#111827] mr-1.5 tracking-tight">Keywords:</span>
              <span>{doc.keywords}</span>
            </div>
          )}
          
          {doc.meshTerms && doc.meshTerms.length > 0 && (
            <div className="pl-1 mb-8">
              <h3 className="text-[13.5px] font-bold text-[#111827] mb-3 font-display tracking-tight">MeSH Terms</h3>
              <ul className="text-[13.5px] text-[#334155] space-y-[4px] font-sans antialiased">
                {doc.meshTerms.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

"""

content = content.replace(old_panel, new_panel)

with open(app_path, 'w') as f:
    f.write(content)

print("Panel fully polished to exact spec.")
