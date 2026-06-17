import type {
  RoomActiveReactionSnapshot,
  RoomParticipantSnapshot,
  RoomSnapshot,
  VoteResultStats,
  VoteSummaryEntry,
} from "@lealplanningpoker/shared";
import {
  calculateVoteResultStats,
  shouldRevealVoteForViewer,
  summarizeVotes,
} from "@lealplanningpoker/shared";

export interface RoomParticipantView {
  id: string;
  name: string;
  isHost: boolean;
  isSelf: boolean;
  connected: boolean;
  hasVoted: boolean;
  vote: RoomParticipantSnapshot["vote"];
  visibleVote: RoomParticipantSnapshot["vote"];
  tableVote: RoomParticipantSnapshot["vote"];
  joinedAt: string;
  updatedAt: string;
}

export interface RoomViewModel {
  roomId: string;
  hostName: string;
  story: string;
  isHost: boolean;
  canClaimHost: boolean;
  canVote: boolean;
  canReveal: boolean;
  canReset: boolean;
  canFinalize: boolean;
  canSetStory: boolean;
  isFinalized: boolean;
  participants: RoomParticipantView[];
  activeReactions: RoomActiveReactionSnapshot[];
  resultStats: VoteResultStats | null;
  voteSummary: VoteSummaryEntry[];
}

export function buildRoomViewModel(snapshot: RoomSnapshot): RoomViewModel {
  const participants = snapshot.participants.map((participant) =>
    toParticipantView(snapshot, participant),
  );
  const isHost = snapshot.viewer.isHost;
  const viewer = participants.find((participant) => participant.isSelf) ?? null;
  const hostParticipant = participants.find((participant) => participant.isHost) ?? null;
  const isVoting = snapshot.phase === "voting";
  const isRevealed = snapshot.phase === "revealed";
  const isFinalized = snapshot.phase === "finalized";
  const shouldShowResults = isRevealed || isFinalized;
  const resultVotes = snapshot.participants.map((participant) => participant.vote);
  const canSetStory =
    isHost &&
    (snapshot.phase === "lobby" ||
      isFinalized ||
      (isVoting && snapshot.participants.every((participant) => !participant.hasVoted)));

  return {
    roomId: snapshot.roomId,
    hostName: snapshot.hostName,
    story: snapshot.story,
    isHost,
    canClaimHost: Boolean(
      viewer &&
        hostParticipant &&
        !viewer.isHost &&
        viewer.connected &&
        !hostParticipant.connected,
    ),
    canVote: isVoting,
    canReveal: isHost && isVoting,
    canReset: isHost && (isRevealed || isFinalized),
    canFinalize: isHost && isRevealed,
    canSetStory,
    isFinalized,
    participants,
    activeReactions: snapshot.activeReactions,
    resultStats: shouldShowResults ? calculateVoteResultStats(resultVotes) : null,
    voteSummary: shouldShowResults ? summarizeVotes(resultVotes) : [],
  };
}

function toParticipantView(
  snapshot: RoomSnapshot,
  participant: RoomParticipantSnapshot,
): RoomParticipantView {
  const visibleVote = shouldRevealVoteForViewer({
    phase: snapshot.phase,
    isSelf: participant.id === snapshot.viewer.participantId,
  })
    ? participant.vote
    : null;
  const tableVote =
    snapshot.phase === "revealed" || snapshot.phase === "finalized" ? participant.vote : null;

  return {
    id: participant.id,
    name: participant.name,
    isHost: participant.isHost,
    isSelf: participant.id === snapshot.viewer.participantId,
    connected: participant.connected,
    hasVoted: participant.hasVoted,
    vote: participant.vote,
    visibleVote,
    tableVote,
    joinedAt: participant.joinedAt,
    updatedAt: participant.updatedAt,
  };
}
