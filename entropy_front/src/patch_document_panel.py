import re

app_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/App.jsx'
with open(app_path, 'r') as f:
    content = f.read()

# 1. Update the icons
icons_update = """  ExternalLink: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  SaveIcon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>,
  XClose: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
"""
if "ExternalLink: ()" not in content:
    content = content.replace("const icons = {", "const icons = {\n" + icons_update)

# 2. Add the DocumentDetailPanel component right before `const App = () => {` or `export default function App() {`
panel_component = """
const DocumentDetailPanel = ({ doc, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!doc) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-gray-900/40 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%', opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.5 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-[45%] min-w-[500px] max-w-[800px] bg-white shadow-2xl z-50 overflow-y-auto flex flex-col border-l border-gray-200"
      >
        <div className="flex-1 p-8">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <icons.XClose />
          </button>
          
          <h2 className="text-[20px] font-semibold text-[#2563EB] pr-10 mb-4 leading-snug">
            {doc.title}
          </h2>
          
          <div className="mb-6 space-y-1">
            <div className="text-[13px] font-medium text-gray-900">{doc.source}</div>
            <div className="text-[13px] text-gray-600">{doc.journal}</div>
            <div className="text-[13px] text-gray-500">{doc.date} &middot; {doc.authors}</div>
            {doc.pmcid && (
              <div className="text-[12px] text-gray-400 font-mono mt-1">
                PMCID: {doc.pmcid} &nbsp; DOI: {doc.doi}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3 mb-8">
            <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-md text-[13px] font-medium flex items-center space-x-2 transition-colors shadow-sm">
              <icons.SaveIcon />
              <span>Save to Workspace</span>
            </button>
            <button className="bg-white hover:bg-gray-50 text-[#2563EB] px-4 py-2 rounded-md border border-gray-200 text-[13px] font-medium flex items-center space-x-2 transition-colors shadow-sm">
              <icons.ExternalLink />
              <span>View online</span>
            </button>
          </div>
          
          <hr className="border-gray-200 mb-8" />
          
          <div className="mb-8">
            <h3 className="text-[14px] font-bold text-gray-900 mb-3">Abstract</h3>
            <p className="text-[14px] text-gray-700 leading-relaxed text-justify">
              {doc.abstract || "Abstract not available for this document."}
            </p>
          </div>
          
          {doc.keywords && (
            <div className="mb-8">
              <span className="text-[14px] font-bold text-gray-900 mr-2">Keywords:</span>
              <span className="text-[14px] text-gray-700">{doc.keywords}</span>
            </div>
          )}
          
          {doc.meshTerms && doc.meshTerms.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[14px] font-bold text-gray-900 mb-3">MeSH Terms</h3>
              <ul className="text-[14px] text-gray-700 space-y-1">
                {doc.meshTerms.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

"""
if "const DocumentDetailPanel =" not in content:
    content = content.replace("export default function App() {", panel_component + "export default function App() {")

# 3. Update the docs array
old_docs_pattern = r"const docs = \[\s*\{\s*title: \"Circadian[^\]]*\];"
new_docs = """const docs = [
    {
      title: "Circadian regulation of microglia function: Potential targets for treatment of Parkinson's Disease.",
      source: "MEDLINE",
      journal: "Ageing research reviews",
      date: "2024 Feb",
      authors: "Kou Liang, +10 Wang Tao",
      aiAnswer: "<strong>Microglial circadian clock</strong> targets in Parkinson's disease include cytokine release, <strong>phagocytosis</strong>, and <strong>α-synuclein processes</strong>.",
      abstract: "The circadian clock regulates various physiological processes, including immune responses. Microglia, as the primary immune cells in the central nervous system, exhibit circadian rhythms in their functions such as phagocytosis and cytokine release. Disruption of circadian rhythms is a common non-motor symptom in Parkinson's disease (PD) and may exacerbate neuroinflammation and neurodegeneration.",
      keywords: "Circadian rhythms, Microglia, Neuroinflammation",
      meshTerms: ["Parkinson Disease", "Microglia", "Circadian Rhythm", "Phagocytosis"]
    },
    {
      title: "Microglial Ion Channels as Potential Targets for Neuroprotection in Parkinson's Disease",
      source: "PubMed Central",
      journal: "Neural Plasticity",
      date: "2013 Jan",
      authors: "Richardson Jason R., Hossain Muhammad M.",
      pmcid: "PMC3556888",
      doi: "10.1155/2013/462106",
      aiAnswer: "<strong>Microglial ion channels</strong> are potential targets for neuroprotection in Parkinson's disease, aiming to reduce neuroinflammation with a holistic approach to increase quality of life.",
      abstract: "Neuroinflammation is a critical pathophysiological hallmark of neurodegenerative disorders, including Alzheimer's disease (AD), Parkinson's disease (PD), and traumatic brain injury (TBI). Microglia, the first responders of the brain, are the drivers of this neuroinflammation. Microglial activation, leading to induction of pro-inflammatory factors, like Interleukin 1-β (IL-1β), Tumor necrosis factor-α (TNFα), nitrites, and others, have been shown to induce neurodegeneration. Non-steroidal anti-inflammatory drugs (NSAIDs) have been shown to reduce the risk of developing PD, but the mechanism underlying the microglial activation is still under active research. Recently, microglial ion channels have come to the forefront as potential drug targets in multiple neurodegenerative disorders, including AD and PD. Microglia expresses a variety of ion channels, including potassium channels, calcium channels, chloride channels, sodium channels, and proton channels. The diversity of channels present on microglia is responsible for the dynamic nature of these immune cells of the brain. These ion channels regulate microglial proliferation, chemotaxis, phagocytosis, antigen recognition and presentation, apoptosis, and cell signaling leading to inflammation, among other critical functions. Understanding the role of these ion channels and the signaling mechanism these channels regulate under pathological conditions is an active area of research. This review will be focusing on the roles of different microglial ion channels, and their potential role in regulating microglial functions in neurodegenerative disorders.",
      keywords: "Channels, Microglia, Neuroinflammation",
      meshTerms: ["Alzheimer Disease", "Humans", "Inflammation", "Ion Channels", "Microglia", "Neurodegenerative Diseases", "Parkinson Disease", "Tumor Necrosis Factor-alpha"]
    }
  ];"""
content = re.sub(old_docs_pattern, new_docs, content)

# 4. We need to render DocumentDetailPanel when selectedDoc is present.
# Where do we inject it?
# In App.jsx, the main column has `className="flex-1 flex max-w-[1920px] ... relative"`
# We can inject it just before the closing tag of that div, inside the AnimatePresence that handles routing?
# Wait, AnimatePresence for the panel should be placed inside `className="flex-1 flex max-w-[1920px] ..."`
# Let's search for `{/* Right Sidebar */}` and `<RightSidebar />` and place it after that.
overlay_injection = """
            {/* Right Sidebar */}
            <RightSidebar />
            
            {/* Document Detail Panel Overlay */}
            <AnimatePresence>
              {selectedDoc && (
                <DocumentDetailPanel 
                  doc={selectedDoc} 
                  onClose={() => setSelectedDoc(null)} 
                />
              )}
            </AnimatePresence>
"""

content = content.replace("{/* Right Sidebar */}\n            <RightSidebar />", overlay_injection)

# Wait, `className="flex-1 flex max-w-[1920px] w-full mx-auto overflow-hidden h-full relative"` needs `relative` added if not.
content = content.replace("mx-auto overflow-hidden h-full\"", "mx-auto overflow-hidden h-full relative\"")

with open(app_path, 'w') as f:
    f.write(content)

print("Document Details Panel Patched successfully.")
