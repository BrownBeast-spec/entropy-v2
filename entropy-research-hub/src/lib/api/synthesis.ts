import { GraphEdge, GraphNode, WorkspaceMode } from "@/types/workspace";
import { buildApiUrl } from "./baseUrl";

export type SynthesisSection = {
  title: string;
  content: string;
  citations: Array<{
    id: string;
    nodeId: string;
    source: string;
    label: string;
  }>;
};

export type SynthesisRequest = {
  graphSnapshot: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  personaMode: WorkspaceMode;
  reportSections: string[];
  indiaLens?: boolean; // NEW: India Lens filtering
  streaming?: boolean; // NEW: Enable streaming mode
};

export async function generateSynthesis(
  payload: SynthesisRequest,
): Promise<{ sections: SynthesisSection[] }> {
  const res = await fetch(buildApiUrl("/api/causaly/synthesise"), {
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
      body?.error?.message ?? `Failed to generate synthesis: HTTP ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return {
    sections: Array.isArray(data?.sections) ? data.sections : [],
  };
}

/**
 * Streaming Synthesis Callbacks
 * Real-time updates during multi-step synthesis process
 */
export interface SynthesisStreamCallbacks {
  onSectionStart?: (title: string) => void;
  onSectionChunk?: (title: string, chunk: string) => void;
  onReasoningChunk?: (title: string, reasoning: string) => void;
  onSectionComplete?: (section: SynthesisSection) => void;
  onComplete?: (result: { sections: SynthesisSection[] }) => void;
  onError?: (error: string) => void;
}

/**
 * Generate synthesis with streaming support
 * Uses Server-Sent Events (SSE) for real-time updates
 * @param payload - Synthesis request configuration
 * @param callbacks - Event handlers for streaming updates
 */
export async function synthesizeWithStreaming(
  payload: SynthesisRequest,
  callbacks: SynthesisStreamCallbacks
): Promise<void> {
  const response = await fetch(buildApiUrl("/api/causaly/synthesise"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, streaming: true }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to start synthesis stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim() || !line.startsWith("data: ")) continue;

        try {
          const jsonStr = line.slice(6); // Remove "data: " prefix
          const data = JSON.parse(jsonStr);
          
          // Extract event type from previous line if available
          const eventMatch = lines[lines.indexOf(line) - 1]?.match(/^event: (\w+)$/);
          const event = eventMatch?.[1] || data.event;

          switch (event) {
            case "section_start":
              callbacks.onSectionStart?.(data.title);
              break;
            case "section_chunk":
              callbacks.onSectionChunk?.(data.title, data.chunk);
              break;
            case "reasoning_chunk":
              callbacks.onReasoningChunk?.(data.title, data.reasoning);
              break;
            case "section_complete":
              callbacks.onSectionComplete?.(data);
              break;
            case "complete":
              callbacks.onComplete?.(data);
              break;
            case "error":
              callbacks.onError?.(data.error);
              break;
          }
        } catch (parseError) {
          console.warn("Failed to parse SSE data:", line, parseError);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
