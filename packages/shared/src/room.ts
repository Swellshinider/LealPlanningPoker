import { FIBONACCI_DECK, type VoteCard } from "./deck";

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

  return FIBONACCI_DECK.flatMap((card) => {
    const count = counts.get(card);
    return count ? [{ card, count }] : [];
  });
}

export function shouldRevealVoteForViewer(options: {
  phase: RoomPhase;
  isHost: boolean;
  isSelf: boolean;
}): boolean {
  return options.isHost || options.isSelf || options.phase !== "voting";
}
