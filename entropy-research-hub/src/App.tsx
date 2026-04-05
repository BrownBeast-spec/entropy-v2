import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/layout/AppShell";
import AgentPage from "@/pages/AgentPage";
import TopicsPage from "@/pages/TopicsPage";
import PeoplePage from "@/pages/PeoplePage";
import CompaniesPage from "@/pages/CompaniesPage";
import WorkspacesPage from "@/pages/WorkspacesPage";
import AutomationsPage from "@/pages/AutomationsPage";
import SettingsOrganization from "@/pages/settings/SettingsOrganization";
import SettingsMembers from "@/pages/settings/SettingsMembers";
import SettingsIntegrations from "@/pages/settings/SettingsIntegrations";
import SettingsMcpServers from "@/pages/settings/SettingsMcpServers";
import NotFound from "@/pages/NotFound";
import WorkspaceQueriesPage from "@/pages/WorkspaceQueriesPage";
import WorkspaceQueryView from "@/pages/WorkspaceQueryView";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/workspaces" replace />} />
              <Route path="/agent" element={<AgentPage />} />
              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/workspaces" element={<WorkspacesPage />} />
              <Route path="/workspaces/:workspaceId" element={<WorkspaceQueriesPage />} />
              <Route
                path="/workspaces/:workspaceId/queries/:queryId"
                element={<WorkspaceQueryView />}
              />
              <Route path="/automations" element={<AutomationsPage />} />
              <Route path="/settings" element={<SettingsOrganization />} />
              <Route path="/settings/organization" element={<SettingsOrganization />} />
              <Route path="/settings/members" element={<SettingsMembers />} />
              <Route path="/settings/integrations" element={<SettingsIntegrations />} />
              <Route path="/settings/mcp-servers" element={<SettingsMcpServers />} />
              <Route path="/settings/*" element={<SettingsOrganization />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
