// Per-agent send queue — prevents concurrent Wasender requests from the same agent
// that cause 429 rate limit errors when multiple webhooks fire simultaneously
// (e.g. WhatsApp gallery sending 3+ photos at once).
//
// Each agent gets an independent queue so agents never block each other.
// The queue is in-memory per Vercel function instance — sufficient for current scale.

type QueuedTask = () => Promise<void>;

// Map of agentId -> promise chain (the tail of the queue)
const agentQueues = new Map<string, Promise<void>>();

// Minimum gap between consecutive sends to the same agent (ms).
// Wasender paid plan allows 256 req/min ≈ 234ms between requests.
// We use 300ms as a safe buffer.
const MIN_SEND_GAP_MS = 300;

/**
 * Enqueues a send task for a given agent.
 * Tasks run sequentially per agent with a minimum gap between each.
 * Concurrent calls for different agents run in parallel.
 */
export function enqueueForAgent(agentId: string, task: QueuedTask): Promise<void> {
  // Get the current tail of this agent's queue, or a resolved promise if idle
  const current = agentQueues.get(agentId) ?? Promise.resolve();

  // Chain the new task after the current tail, with a gap delay
  const next = current
    .then(() => new Promise<void>(resolve => setTimeout(resolve, MIN_SEND_GAP_MS)))
    .then(() => task())
    .catch(err => {
      // Log but don't propagate — a failed send shouldn't break the queue
      console.error(`[send-queue] Task failed for agent ${agentId}:`, err);
    });

  // Update the tail
  agentQueues.set(agentId, next);

  // Clean up the map entry once the queue drains to avoid memory leaks
  next.finally(() => {
    if (agentQueues.get(agentId) === next) {
      agentQueues.delete(agentId);
    }
  });

  return next;
}