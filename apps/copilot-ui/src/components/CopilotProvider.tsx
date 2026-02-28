"use client";

import { CopilotKit } from "@copilotkit/react-core";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function CopilotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CopilotKit runtimeUrl={`${API_URL}/api/chat`} agent="plannerAgent">
      {children}
    </CopilotKit>
  );
}
