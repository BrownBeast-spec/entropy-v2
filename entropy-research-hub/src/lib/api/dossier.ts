import { WorkspaceMode } from "@/types/workspace";
import { buildApiUrl } from "./baseUrl";

type DossierSection = {
  title: string;
  content: string;
  citations: Array<{
    id: string;
    nodeId: string;
    source: string;
    label: string;
  }>;
};

export type GenerateDossierRequest = {
  workspaceId: string;
  query: string;
  personaMode: WorkspaceMode;
  reportSections: DossierSection[];
};

export type GenerateDossierResult = {
  filename: string;
  latex: string;
};

export async function generateDossier(
  payload: GenerateDossierRequest,
): Promise<GenerateDossierResult> {
  const res = await fetch(buildApiUrl("/api/causaly/dossier"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: { message: "Unknown API error" } }));
    const message =
      body?.error?.message ?? `Failed to generate dossier: HTTP ${res.status}`;
    throw new Error(message);
  }

  if (!res.body) {
    throw new Error("Failed to generate dossier: empty response stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completePayload: GenerateDossierResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const rawEvent of events) {
      const eventLine = rawEvent
        .split("\n")
        .find((line) => line.startsWith("event: "));
      const dataLine = rawEvent
        .split("\n")
        .find((line) => line.startsWith("data: "));

      if (!eventLine || !dataLine) continue;

      const eventName = eventLine.replace("event: ", "").trim();
      if (eventName !== "complete") continue;

      const parsed = JSON.parse(dataLine.replace("data: ", ""));
      if (typeof parsed?.filename === "string" && typeof parsed?.latex === "string") {
        completePayload = {
          filename: parsed.filename,
          latex: parsed.latex,
        };
      }
    }
  }

  if (!completePayload) {
    throw new Error("Failed to generate dossier: missing complete event");
  }

  return completePayload;
}
