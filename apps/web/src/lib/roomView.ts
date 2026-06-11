import type {
  RoomParticipantSnapshot,
  RoomPhase,
  RoomSnapshot,
  VoteSummaryEntry
} from "@lealplanningpoker/shared";
import { shouldRevealVoteForViewer, summarizeVotes } from "@lealplanningpoker/shared";

export interface RoomParticipantView {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  hasVoted: boolean;
  vote: RoomParticipantSnapshot["vote"];
  visibleVote: RoomParticipantSnapshot["vote"];
  joinedAt: string;
  updatedAt: string;
}

export interface RoomViewModel {
  phaseLabel: string;
  phaseCopy: string;
  roomId: string;
  hostName: string;
  story: string;
  connectedCount: number;
  votedCount: number;
  totalParticipants: number;
  canReveal: boolean;
  canReset: boolean;
  canFinalize: boolean;
  canSetStory: boolean;
  participants: RoomParticipantView[];
  voteSummary: VoteSummaryEntry[];
  isLiveReveal: boolean;
}

const PHASE_LABELS: Record<RoomPhase, string> = {
  lobby: "Lobby",
  voting: "Voting",
  revealed: "Revealed",
  finalized: "Finalized"
};

const PHASE_COPY: Record<RoomPhase, string> = {
  lobby: "Share the room code and wait for the team to join.",
  voting: "Vote privately. The host will reveal the cards when ready.",
  revealed: "Everyone can see the votes now.",
  finalized: "This story is archived. Start the next one when you are ready."
};

export function buildRoomViewModel(snapshot: RoomSnapshot): RoomViewModel {
  const participants = snapshot.participants.map((participant) =>
    toParticipantView(snapshot, participant)
  );
  const connectedCount = snapshot.participants.filter((participant) => participant.connected).length;
  const votedCount = snapshot.participants.filter((participant) => participant.hasVoted).length;
  const isHost = snapshot.viewer.isHost;
  const isVoting = snapshot.phase === "voting";
  const isRevealed = snapshot.phase === "revealed";
  const isFinalized = snapshot.phase === "finalized";
  const canSetStory =
    isHost &&
    (snapshot.phase === "lobby" ||
      isFinalized ||
      (isVoting && snapshot.participants.every((participant) => !participant.hasVoted)));

  return {
    phaseLabel: PHASE_LABELS[snapshot.phase],
    phaseCopy: PHASE_COPY[snapshot.phase],
    roomId: snapshot.roomId,
    hostName: snapshot.hostName,
    story: snapshot.story,
    connectedCount,
    votedCount,
    totalParticipants: snapshot.participants.length,
    canReveal: isHost && isVoting,
    canReset: isHost && (isRevealed || isFinalized),
    canFinalize: isHost && isRevealed,
    canSetStory,
    participants,
    voteSummary: isRevealed || isFinalized ? summarizeVotes(snapshot.participants.map((participant) => participant.vote)) : [],
    isLiveReveal: isRevealed
  };
}

function toParticipantView(
  snapshot: RoomSnapshot,
  participant: RoomParticipantSnapshot
): RoomParticipantView {
  const visibleVote = shouldRevealVoteForViewer({
    phase: snapshot.phase,
    isHost: snapshot.viewer.isHost,
    isSelf: participant.id === snapshot.viewer.participantId
  })
    ? participant.vote
    : null;

  return {
    id: participant.id,
    name: participant.name,
    isHost: participant.isHost,
    connected: participant.connected,
    hasVoted: participant.hasVoted,
    vote: participant.vote,
    visibleVote,
    joinedAt: participant.joinedAt,
    updatedAt: participant.updatedAt
  };
}
