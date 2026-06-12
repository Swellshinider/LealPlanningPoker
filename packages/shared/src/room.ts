import { FIBONACCI_DECK, isBuiltInVoteCard, type VoteCard } from "./deck.js";

export type RoomPhase = "lobby" | "voting" | "revealed" | "finalized";

export interface VoteSummaryEntry {
  card: VoteCard;
  count: number;
}

export interface RoomParticipantSnapshot {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  vote: VoteCard | null;
  hasVoted: boolean;
  joinedAt: string;
  updatedAt: string;
}

export interface RoomHistoryEntry {
  id: string;
  story: string;
  finalizedAt: string;
  voteSummary: VoteSummaryEntry[];
  votes: Array<{
    participantId: string;
    name: string;
    vote: VoteCard | null;
  }>;
}

export interface RoomSnapshot {
  roomId: string;
  hostName: string;
  story: string;
  phase: RoomPhase;
  participants: RoomParticipantSnapshot[];
  history: RoomHistoryEntry[];
  updatedAt: string;
  viewer: {
    participantId: string;
    isHost: boolean;
  };
}

export function normalizeDisplayName(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, " ");
  return collapsed.length > 0 ? collapsed.slice(0, 32) : "Anonymous";
}

export function summarizeVotes(
  votes: readonly (VoteCard | null | undefined)[]
): VoteSummaryEntry[] {
  const counts = new Map<VoteCard, number>();

  for (const vote of votes) {
    if (!vote) {
      continue;
    }

    counts.set(vote, (counts.get(vote) ?? 0) + 1);
  }

  const builtInSummary = FIBONACCI_DECK.flatMap((card) => {
    const count = counts.get(card);
    return count ? [{ card, count }] : [];
  });

  const customSummary = [...counts.entries()]
    .filter(([card]) => !isBuiltInVoteCard(card))
    .sort(([left], [right]) => compareNumericVoteStrings(left, right))
    .map(([card, count]) => ({ card, count }));

  return [...builtInSummary, ...customSummary];
}

export function shouldRevealVoteForViewer(options: {
  phase: RoomPhase;
  isSelf: boolean;
}): boolean {
  return options.isSelf || options.phase === "revealed" || options.phase === "finalized";
}

function compareNumericVoteStrings(left: string, right: string): number {
  const normalizedLeft = left.replace(/^0+(?=\d)/, "");
  const normalizedRight = right.replace(/^0+(?=\d)/, "");

  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length - normalizedRight.length;
  }

  return normalizedLeft.localeCompare(normalizedRight);
}
