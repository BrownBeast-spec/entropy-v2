import { ChevronRight, MessageSquare, Hash, GitBranch, MousePointer, Bot, BarChart3, Mail, MessageCircle, BookOpen } from "lucide-react";

const integrations = [
  { name: "Slack", icon: MessageSquare, color: "text-purple-400", connected: true },
  { name: "Discord", icon: MessageCircle, color: "text-indigo-400", connected: false },
  { name: "GitHub", icon: GitBranch, color: "text-foreground", connected: false },
  { name: "Cursor", icon: MousePointer, color: "text-muted-foreground", connected: false },
  { name: "Devin", icon: Bot, color: "text-green-400", connected: false },
  { name: "Linear", icon: Hash, color: "text-blue-400", connected: false },
  { name: "PostHog", icon: BarChart3, color: "text-orange-400", connected: false },
  { name: "Inbound Email", icon: Mail, color: "text-muted-foreground", connected: false },
  { name: "Intercom", icon: MessageSquare, color: "text-blue-400", connected: false },
  { name: "Notion", icon: BookOpen, color: "text-foreground", connected: false },
];

export default function SettingsIntegrations() {
  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <h1 className="text-lg font-semibold text-foreground mb-6">Integrations</h1>

      <div className="grid grid-cols-3 gap-3">
        {integrations.map((item) => (
          <button
            key={item.name}
            className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-4 hover:bg-accent/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-2xs text-muted-foreground flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.connected ? "bg-primary" : "bg-muted-foreground"}`} />
                  {item.connected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
