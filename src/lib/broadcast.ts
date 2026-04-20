/**
 * In-process event broadcaster for SSE.
 *
 * Single-instance only — in multi-instance deployments, replace with
 * Redis pub/sub or Postgres LISTEN/NOTIFY. Usage:
 *
 *   broadcast("inquiry.new", inquiryPayload);
 *   const unsub = subscribe(["inquiry.new"], (ev, data) => ...);
 */

export type BroadcastEvent =
  | "inquiry.new"
  | "inquiry.status_change"
  | "appointment.new"
  | "review.new"
  | "review.flagged"
  | "price_watch.new"
  | "gallery.submitted"
  | "qa.submitted";

type Listener = (event: BroadcastEvent, data: unknown) => void;

const listeners = new Set<Listener>();

export function broadcast(event: BroadcastEvent, data: unknown): void {
  for (const l of listeners) {
    try {
      l(event, data);
    } catch (err) {
      console.warn("[broadcast] listener threw:", err);
    }
  }
}

export function subscribe(events: BroadcastEvent[] | "all", handler: Listener): () => void {
  const wrap: Listener = (ev, data) => {
    if (events === "all" || events.includes(ev)) handler(ev, data);
  };
  listeners.add(wrap);
  return () => {
    listeners.delete(wrap);
  };
}

export function listenerCount(): number {
  return listeners.size;
}
