"use client";

import { CopilotChat } from "@copilotkit/react-ui";

interface CopilotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CopilotSidebar({ isOpen, onClose }: CopilotSidebarProps) {
  return (
    <>
      {/* Toggle button */}
      <button
        className="sidebar-toggle"
        onClick={onClose}
        title={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? "✕" : "✦"}
      </button>

      {/* Slide-in sidebar */}
      <aside className={`copilot-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <div className="sidebar-title-icon">✦</div>
            Entropy AI Assistant
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
            ✕
          </button>
        </div>

        <div className="sidebar-body">
          <CopilotChat
            labels={{
              title: "Entropy Planner",
              initial:
                "👋 Hi! I'm the Entropy Planner. Ask me about drug repurposing hypotheses, PICO frameworks, or how to structure your research query.",
              placeholder: "Ask about drug repurposing…",
            }}
            instructions={`You are the Planner Agent for the Entropy drug repurposing research platform. 
Help users construct well-formed drug repurposing queries using the PICO framework. 
Suggest how to specify the population, intervention, comparison, and outcome for the best results.
When users share a hypothesis, guide them on what evidence the pipeline will gather.`}
          />
        </div>
      </aside>
    </>
  );
}
