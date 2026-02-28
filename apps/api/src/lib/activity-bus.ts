import { EventEmitter } from "node:events";

// ─── Event type ───────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "step:start"
  | "step:done"
  | "step:fail"
  | "tool:call"
  | "tool:result"
  | "hitl:suspended"
  | "pipeline:done"
  | "pipeline:fail";

export interface ActivityEvent {
  id: string;          // monotonic counter as string
  ts: number;          // unix ms
  type: ActivityEventType;
  agentId: string;     // "planner", "biologist", etc. — or "pipeline"
  toolName?: string;
  message: string;
  detail?: string;     // extra context (truncated output etc.)
}

// ─── Bus ─────────────────────────────────────────────────────────────────────

class ActivityBus extends EventEmitter {
  private counters = new Map<string, number>();

  /** Publish an event to a session channel; auto-assign incremental id. */
  publish(sessionId: string, partial: Omit<ActivityEvent, "id">): ActivityEvent {
    const count = (this.counters.get(sessionId) ?? 0) + 1;
    this.counters.set(sessionId, count);
    const event: ActivityEvent = { ...partial, id: String(count) };
    this.emit(sessionId, event);
    return event;
  }

  /** Subscribe to events for a session. */
  subscribe(sessionId: string, listener: (e: ActivityEvent) => void): void {
    this.on(sessionId, listener);
  }

  /** Unsubscribe from a session. */
  unsubscribe(sessionId: string, listener: (e: ActivityEvent) => void): void {
    this.off(sessionId, listener);
  }

  /** Clean up when a session is done. */
  drain(sessionId: string): void {
    this.removeAllListeners(sessionId);
    this.counters.delete(sessionId);
  }
}

export const activityBus = new ActivityBus();
activityBus.setMaxListeners(100); // many concurrent SSE connections
