import { FIBONACCI_DECK, isBuiltInVoteCard, normalizeVoteCard } from "@lealplanningpoker/shared";
import type { VoteCard as VoteValue } from "@lealplanningpoker/shared";

// The voting deck shown in the dock: the built-in Fibonacci sequence. Spread
// into a plain mutable array so callers can reorder/slice without touching the
// shared readonly tuple.
export const DECK: VoteValue[] = [...FIBONACCI_DECK];

// Resolves the current custom-vote draft into a whole-number vote value, or
// null when the draft is not a usable custom vote. Built-in cards such as "?"
// are rejected here — the dock renders those as their own buttons.
export function resolveCustomVote(draft: string): VoteValue | null {
  const normalized = normalizeVoteCard(draft);
  return normalized && /^\d+$/.test(normalized) ? normalized : null;
}

export function isCustomVoteSelected(selectedVote: VoteValue | null): boolean {
  return Boolean(selectedVote && !isBuiltInVoteCard(selectedVote));
}
