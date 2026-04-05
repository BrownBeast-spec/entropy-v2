import { Bot, Users, Briefcase, Calendar, SlidersHorizontal, Lock, Send, ChevronLeft, ChevronRight } from "lucide-react";

const suggestions = [
  { icon: Users, text: "All External Feedback Today" },
  { icon: Briefcase, text: "What We Shipped this Week" },
  { icon: Bot, text: "How Customers are Feeling" },
];

export default function AgentPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in">
      <div className="flex flex-col items-center gap-6 max-w-lg">
        <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Bot className="w-6 h-6" />
          How Can I Help Today?
        </div>
        <div className="w-full bg-card rounded-lg border border-border">
          <textarea
            placeholder="Ask something..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground p-4 pb-2 resize-none focus:outline-none min-h-[80px]"
            rows={3}
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-3 text-muted-foreground">
              <button className="w-5 h-5 rounded-full border border-border" />
              <button><SlidersHorizontal className="w-3.5 h-3.5" /></button>
              <button className="flex items-center gap-1 text-2xs">
                <Calendar className="w-3 h-3" /> 30d
              </button>
              <button><Lock className="w-3 h-3" /></button>
            </div>
            <button className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Help Me Summarize:</p>
          <div className="flex items-center gap-2">
            <button className="p-1 text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-[12px] text-foreground hover:bg-accent transition-colors"
              >
                <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                {s.text}
              </button>
            ))}
            <button className="p-1 text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
