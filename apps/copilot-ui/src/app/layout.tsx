import type { Metadata } from "next";
import { CopilotProvider } from "@/components/CopilotProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entropy — Drug Repurposing Research Platform",
  description:
    "Autonomous multi-agent drug repurposing research powered by Mastra and CopilotKit. Submit a hypothesis; get a fully cited, peer-reviewable dossier.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <CopilotProvider>{children}</CopilotProvider>
      </body>
    </html>
  );
}
