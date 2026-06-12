import { FIBONACCI_DECK, isBuiltInVoteCard, type VoteCard } from "./deck.js";

export type RoomPhase = "lobby" | "voting" | "revealed" | "finalized";

export interface VoteSummaryEntry {
  card: VoteCard;
  count: number;
}

export interface VoteResultStats {
  average: number | null;
  confidence: number | null;
  numericVoteCount: number;
  unknownVoteCount: number;
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

export function calculateVoteResultStats(
  votes: readonly (VoteCard | null | undefined)[]
): VoteResultStats {
  const numericVotes: number[] = [];
  const numericCounts = new Map<string, number>();
  let unknownVoteCount = 0;

  for (const vote of votes) {
    if (!vote || vote === "coffee") {
      continue;
    }

    if (vote === "?") {
      unknownVoteCount += 1;
      continue;
    }

    if (!NUMERIC_VOTE_PATTERN.test(vote)) {
      continue;
    }

    const normalizedVote = vote.replace(/^0+(?=\d)/, "");
    numericVotes.push(Number(normalizedVote));
    numericCounts.set(normalizedVote, (numericCounts.get(normalizedVote) ?? 0) + 1);
  }

  const average =
    numericVotes.length > 0
      ? numericVotes.reduce((total, vote) => total + vote, 0) / numericVotes.length
      : null;
  const confidenceDenominator = numericVotes.length + unknownVoteCount;
  const mostCommonNumericVoteCount =
    numericCounts.size > 0 ? Math.max(...numericCounts.values()) : 0;
  const confidence =
    confidenceDenominator > 0
      ? Math.round((mostCommonNumericVoteCount / confidenceDenominator) * 100)
      : null;

  return {
    average,
    confidence,
    numericVoteCount: numericVotes.length,
    unknownVoteCount
  };
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

const NUMERIC_VOTE_PATTERN = /^\d+$/;
