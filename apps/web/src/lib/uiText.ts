import type { VoteCard } from "@lealplanningpoker/shared";

export function formatVoteLabel(value: VoteCard): string {
  return value === "coffee" ? "Coffee" : value;
}
