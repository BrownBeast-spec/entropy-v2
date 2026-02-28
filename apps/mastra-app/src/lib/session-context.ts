/**
 * AsyncLocalStorage-based session context for mastra-app.
 *
 * This lets the workflow runner (in apps/api) propagate a sessionId and hook
 * callbacks through the entire async call stack – including deep inside the AI
 * SDK doStream() call – without passing them as parameters through every layer.
 *
 * Usage in workflow-runner:
 *   sessionContext.run({ sessionId, onToolCall, onToolResult }, () => run.start(...))
 *
 * Usage in llm.ts wrapper:
 *   const ctx = sessionContext.getStore();
 *   ctx?.onToolCall?.(toolName, args);
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface SessionContextStore {
  sessionId: string;
  onToolCall?: (agentId: string, toolName: string, args: unknown) => void;
  onToolResult?: (agentId: string, toolName: string, result: unknown) => void;
  /** Current step/agent being executed — set by each step wrapper */
  currentAgentId?: string;
}

export const sessionContext = new AsyncLocalStorage<SessionContextStore>();
