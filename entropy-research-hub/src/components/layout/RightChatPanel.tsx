import { useLocation } from "react-router-dom";
import { Send, Lock, Calendar, SlidersHorizontal, Plus, MessageSquare, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const pageNames: Record<string, string> = {
  "/agent": "Agent",
  "/topics": "Topics",
  "/people": "People",
  "/companies": "Companies",
  "/workspaces": "Workspaces",
  "/automations": "Automations",
  "/settings": "Settings",
};

const recentConversations = [
  "A Friendly Greeting to Start Chat",
  "Access Rights for People, Companies, Automations",
  "A Brief Greeting to Start the Chat",
];

export default function RightChatPanel() {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const isAgent = location.pathname === "/agent";
  const isWorkspaces = location.pathname === "/workspaces" || location.pathname === "/";

  const currentPage = Object.entries(pageNames).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || "Topics";

  return (
    <div className="w-[340px] min-w-[340px] h-screen flex flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        {isAgent ? (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="w-4 h-4" />
              Agent
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-accent rounded transition-colors"><Plus className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-foreground truncate">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">A Friendly Greeting to ...</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-accent rounded transition-colors"><Plus className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          </>
        )}
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isAgent ? (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent conversations</h3>
            <div className="space-y-0.5">
              {recentConversations.map((conv, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors",
                    i === 0 ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{conv}</span>
                    {i === 0 && <MoreHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : isWorkspaces ? (
          <div className="p-4 space-y-4">
            <div className="bg-background rounded-lg p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hey — this is your Entropy research assistant. Create a workspace or open an existing one to get started.
              </p>
            </div>
            <div className="space-y-2">
              {["Show me how workspaces work", "What data sources are connected?", "Create a workspace for metformin NASH research."].map((chip, i) => (
                <button key={i} className="w-full text-left px-3 py-2 rounded-md text-[12px] text-muted-foreground bg-accent hover:bg-accent/80 transition-colors">
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex justify-end mb-3">
              <div className="bg-accent rounded-lg px-3 py-2 text-sm text-foreground">Hey</div>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              Hey Alen! 👋 How can I help you today? I see you're on the {currentPage} page — want to explore any specific topics, trends, or anything else?
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="bg-background rounded-lg border border-border">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask something..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground p-3 pb-1 resize-none focus:outline-none min-h-[60px]"
            rows={2}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-2">
              <button className="w-5 h-5 rounded-full border border-border" />
              <button><SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="flex items-center gap-1 text-2xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                30d
              </button>
              <button><Lock className="w-3 h-3 text-muted-foreground" /></button>
            </div>
            <button className="w-7 h-7 rounded-md bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
