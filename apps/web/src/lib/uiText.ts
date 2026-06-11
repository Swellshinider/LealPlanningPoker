import type { VoteCard } from "@lealplanningpoker/shared";

export function formatVoteLabel(value: VoteCard): string {
  return value === "coffee" ? "Coffee" : value;
}

export function getParticipantVoteLabel(options: {
  hasVoted: boolean;
  visibleVote: VoteCard | null;
}): string {
  if (options.visibleVote) {
    return formatVoteLabel(options.visibleVote);
  }

  return options.hasVoted ? "Voted" : "Waiting";
}
