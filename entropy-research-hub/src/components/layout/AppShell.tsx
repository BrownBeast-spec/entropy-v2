import { Outlet, useLocation } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import RightChatPanel from "./RightChatPanel";
import TopBar from "./TopBar";
import SettingsSidebar from "./SettingsSidebar";

export default function AppShell() {
  const location = useLocation();
  const isSettings = location.pathname.startsWith("/settings");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <LeftSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <div className="flex-1 flex min-h-0">
          {isSettings && <SettingsSidebar />}
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <Outlet />
          </main>
        </div>
      </div>
      <RightChatPanel />
    </div>
  );
}
