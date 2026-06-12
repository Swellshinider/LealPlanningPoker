import { randomInt, randomUUID } from "node:crypto";
import {
  type RoomHistoryEntry,
  type RoomParticipantSnapshot,
  type RoomPhase,
  type RoomSnapshot,
  type VoteCard,
  normalizeVoteCard,
  normalizeDisplayName,
  shouldRevealVoteForViewer,
  summarizeVotes
} from "@lealplanningpoker/shared";

export class RoomStoreError extends Error {
  readonly code:
    | "ROOM_NOT_FOUND"
    | "PARTICIPANT_NOT_FOUND"
    | "NOT_HOST"
    | "VOTES_LOCKED"
    | "ROUND_LOCKED"
    | "INVALID_VOTE"
    | "INVALID_STORY"
    | "ROOM_FULL";

  constructor(
    code:
      | "ROOM_NOT_FOUND"
      | "PARTICIPANT_NOT_FOUND"
      | "NOT_HOST"
      | "VOTES_LOCKED"
      | "ROUND_LOCKED"
      | "INVALID_VOTE"
      | "INVALID_STORY"
      | "ROOM_FULL",
    message: string
  ) {
    super(message);
    this.name = "RoomStoreError";
    this.code = code;
  }
}

export interface RoomStoreOptions {
  now?: () => Date;
  idFactory?: () => string;
  roomIdFactory?: () => string;
  roomTtlMs?: number;
}

interface RoomParticipantRecord {
  id: string;
  token: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  vote: VoteCard | null;
  joinedAt: string;
  updatedAt: string;
}

interface RoomRecord {
  roomId: string;
  hostParticipantId: string;
  hostName: string;
  story: string;
  phase: RoomPhase;
  participants: Map<string, RoomParticipantRecord>;
  participantTokens: Map<string, string>;
  history: RoomHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

const MAX_PARTICIPANTS_PER_ROOM = 50;
const MAX_HISTORY_ENTRIES_PER_ROOM = 100;

export interface CreateRoomInput {
  hostName: string;
}

export interface CreateRoomResult {
  roomId: string;
  hostToken: string;
  participantToken: string;
  snapshot: RoomSnapshot;
}

export interface JoinRoomInput {
  roomId: string;
  displayName: string;
  participantToken?: string;
}

export interface JoinRoomResult {
  roomId: string;
  participantToken: string;
  snapshot: RoomSnapshot;
}

export interface RenameParticipantInput {
  roomId: string;
  participantToken: string;
  displayName: string;
}

export interface LeaveRoomInput {
  roomId: string;
  participantToken: string;
}

export interface StoryInput {
  roomId: string;
  hostToken: string;
  story: string;
}

export interface VoteInput {
  roomId: string;
  participantToken: string;
  vote: VoteCard;
}

export interface HostActionInput {
  roomId: string;
  hostToken: string;
}

export interface SnapshotInput {
  roomId: string;
  participantToken: string;
}

export class RoomStore {
  readonly roomTtlMs: number;

  private readonly now: () => Date;

  private readonly idFactory: () => string;

  private readonly roomIdFactory: () => string;

  private readonly rooms = new Map<string, RoomRecord>();

  constructor(options: RoomStoreOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => randomUUID());
    this.roomIdFactory = options.roomIdFactory ?? options.idFactory ?? createRoomCode;
    this.roomTtlMs = options.roomTtlMs ?? 1000 * 60 * 60 * 4;
  }

  createRoom(input: CreateRoomInput): CreateRoomResult {
    const now = this.nowIso();
    const roomId = this.createUniqueRoomId();
    const hostParticipantId = this.nextId();
    const hostToken = this.nextId();
    const hostName = normalizeDisplayName(input.hostName);

    const hostParticipant: RoomParticipantRecord = {
      id: hostParticipantId,
      token: hostToken,
      name: hostName,
      isHost: true,
      connected: true,
      vote: null,
      joinedAt: now,
      updatedAt: now
    };

    const room: RoomRecord = {
      roomId,
      hostParticipantId,
      hostName,
      story: "",
      phase: "lobby",
      participants: new Map([[hostParticipantId, hostParticipant]]),
      participantTokens: new Map([[hostToken, hostParticipantId]]),
      history: [],
      createdAt: now,
      updatedAt: now
    };

    this.rooms.set(roomId, room);

    return {
      roomId,
      hostToken,
      participantToken: hostToken,
      snapshot: this.buildSnapshot(room, hostParticipantId)
    };
  }

  joinRoom(input: JoinRoomInput): JoinRoomResult {
    const room = this.getRoomOrThrow(input.roomId);
    const now = this.nowIso();
    const normalizedName = normalizeDisplayName(input.displayName);

    const existingParticipantId = input.participantToken
      ? room.participantTokens.get(input.participantToken)
      : undefined;

    const participant = existingParticipantId
      ? this.getParticipantOrThrow(room, existingParticipantId)
      : this.createParticipant(room, normalizedName, now);

    participant.connected = true;
    participant.updatedAt = now;
    participant.name = normalizedName;

    if (participant.isHost) {
      room.hostName = normalizedName;
    }

    room.updatedAt = now;

    return {
      roomId: room.roomId,
      participantToken: participant.token,
      snapshot: this.buildSnapshot(room, participant.id)
    };
  }

  syncRoom(input: SnapshotInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.participantToken);
    const now = this.nowIso();

    participant.connected = true;
    participant.updatedAt = now;
    room.updatedAt = now;

    return this.buildSnapshot(room, participant.id);
  }

  renameParticipant(input: RenameParticipantInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.participantToken);
    const now = this.nowIso();
    const name = normalizeDisplayName(input.displayName);

    participant.name = name;
    participant.updatedAt = now;
    if (participant.isHost) {
      room.hostName = name;
    }
    room.updatedAt = now;

    return this.buildSnapshot(room, participant.id);
  }

  leaveRoom(input: LeaveRoomInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.participantToken);
    const now = this.nowIso();

    participant.connected = false;
    participant.updatedAt = now;
    room.updatedAt = now;

    return this.buildSnapshot(room, participant.id);
  }

  setStory(input: StoryInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.hostToken);
    this.assertHost(participant);

    const story = this.normalizeStory(input.story);
    if (room.phase === "revealed") {
      throw new RoomStoreError("ROUND_LOCKED", "Reset or finalize the current round before changing the story.");
    }

    const hasVotes = this.getParticipants(room).some((candidate) => candidate.vote !== null);
    if (room.phase === "voting" && hasVotes) {
      throw new RoomStoreError("ROUND_LOCKED", "Reset or finalize the current round before changing the story.");
    }

    const now = this.nowIso();
    room.story = story;
    room.phase = "voting";
    this.clearVotes(room);
    room.updatedAt = now;

    return this.buildSnapshot(room, participant.id);
  }

  submitVote(input: VoteInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.participantToken);

    if (room.phase !== "voting") {
      throw new RoomStoreError("VOTES_LOCKED", "Votes can only change while the room is voting.");
    }

    const vote = normalizeVoteCard(input.vote);
    if (!vote) {
      throw new RoomStoreError("INVALID_VOTE", "Use a deck card or a whole-number custom vote.");
    }

    const now = this.nowIso();
    participant.vote = vote;
    participant.updatedAt = now;
    room.updatedAt = now;

    return this.buildSnapshot(room, participant.id);
  }

  revealVotes(input: HostActionInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.hostToken);
    this.assertHost(participant);

    if (room.phase === "finalized" || room.phase === "revealed") {
      return this.buildSnapshot(room, participant.id);
    }

    if (room.phase !== "voting") {
      throw new RoomStoreError("ROUND_LOCKED", "Start a voting round before revealing votes.");
    }

    room.phase = "revealed";
    room.updatedAt = this.nowIso();

    return this.buildSnapshot(room, participant.id);
  }

  resetVotes(input: HostActionInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.hostToken);
    this.assertHost(participant);

    this.clearVotes(room);
    room.phase = room.story.length > 0 ? "voting" : "lobby";
    room.updatedAt = this.nowIso();

    return this.buildSnapshot(room, participant.id);
  }

  finalizeStory(input: HostActionInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.hostToken);
    this.assertHost(participant);

    if (room.phase === "finalized") {
      return this.buildSnapshot(room, participant.id);
    }

    if (room.phase !== "revealed") {
      throw new RoomStoreError("ROUND_LOCKED", "Reveal votes before finalizing the story.");
    }

    const now = this.nowIso();
    const participants = this.getParticipants(room);
    const historyEntry: RoomHistoryEntry = {
      id: this.nextId(),
      story: room.story,
      finalizedAt: now,
      voteSummary: summarizeVotes(participants.map((candidate) => candidate.vote)),
      votes: participants.map((candidate) => ({
        participantId: candidate.id,
        name: candidate.name,
        vote: candidate.vote
      }))
    };

    room.history = [...room.history, historyEntry];
    room.history = room.history.slice(-MAX_HISTORY_ENTRIES_PER_ROOM);
    room.phase = "finalized";
    room.updatedAt = now;

    return this.buildSnapshot(room, participant.id);
  }

  expireRooms(now: Date = this.now()): string[] {
    const expired: string[] = [];

    for (const [roomId, room] of this.rooms) {
      const ageMs = now.getTime() - new Date(room.updatedAt).getTime();
      if (ageMs > this.roomTtlMs) {
        this.rooms.delete(roomId);
        expired.push(roomId);
      }
    }

    return expired;
  }

  getSnapshot(input: SnapshotInput): RoomSnapshot {
    const room = this.getRoomOrThrow(input.roomId);
    const participant = this.getParticipantByTokenOrThrow(room, input.participantToken);
    return this.buildSnapshot(room, participant.id);
  }

  private buildSnapshot(room: RoomRecord, viewerParticipantId: string): RoomSnapshot {
    const viewer = this.getParticipantOrThrow(room, viewerParticipantId);
    const participants = this.getParticipants(room).map((participant) =>
      this.toSnapshotParticipant(room, participant, viewer)
    );

    return {
      roomId: room.roomId,
      hostName: room.hostName,
      story: room.story,
      phase: room.phase,
      participants,
      history: room.history,
      updatedAt: room.updatedAt,
      viewer: {
        participantId: viewer.id,
        isHost: viewer.isHost
      }
    };
  }

  private toSnapshotParticipant(
    room: RoomRecord,
    participant: RoomParticipantRecord,
    viewer: RoomParticipantRecord
  ): RoomParticipantSnapshot {
    const visible = shouldRevealVoteForViewer({
      phase: room.phase,
      isSelf: participant.id === viewer.id
    });

    return {
      id: participant.id,
      name: participant.name,
      isHost: participant.isHost,
      connected: participant.connected,
      vote: visible ? participant.vote : null,
      hasVoted: participant.vote !== null,
      joinedAt: participant.joinedAt,
      updatedAt: participant.updatedAt
    };
  }

  private getRoomOrThrow(roomId: string): RoomRecord {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new RoomStoreError("ROOM_NOT_FOUND", `Room ${roomId} was not found.`);
    }
    return room;
  }

  private getParticipantByTokenOrThrow(room: RoomRecord, token: string): RoomParticipantRecord {
    const participantId = room.participantTokens.get(token);
    if (!participantId) {
      throw new RoomStoreError("PARTICIPANT_NOT_FOUND", "That participant token is not registered in this room.");
    }
    return this.getParticipantOrThrow(room, participantId);
  }

  private getParticipantOrThrow(room: RoomRecord, participantId: string): RoomParticipantRecord {
    const participant = room.participants.get(participantId);
    if (!participant) {
      throw new RoomStoreError("PARTICIPANT_NOT_FOUND", `Participant ${participantId} was not found in room ${room.roomId}.`);
    }
    return participant;
  }

  private createParticipant(room: RoomRecord, name: string, now: string): RoomParticipantRecord {
    if (room.participants.size >= MAX_PARTICIPANTS_PER_ROOM) {
      throw new RoomStoreError("ROOM_FULL", "This room is full.");
    }

    const participantId = this.nextId();
    const participantToken = this.nextId();
    const participant: RoomParticipantRecord = {
      id: participantId,
      token: participantToken,
      name,
      isHost: false,
      connected: true,
      vote: null,
      joinedAt: now,
      updatedAt: now
    };

    room.participants.set(participantId, participant);
    room.participantTokens.set(participantToken, participantId);
    room.updatedAt = now;

    return participant;
  }

  private clearVotes(room: RoomRecord): void {
    const now = this.nowIso();
    for (const participant of room.participants.values()) {
      participant.vote = null;
      participant.updatedAt = now;
    }
  }

  private getParticipants(room: RoomRecord): RoomParticipantRecord[] {
    return [...room.participants.values()].sort((left, right) => {
      if (left.isHost !== right.isHost) {
        return left.isHost ? -1 : 1;
      }

      return left.joinedAt.localeCompare(right.joinedAt);
    });
  }

  private normalizeStory(value: string): string {
    const story = value.trim().replace(/\s+/g, " ");
    if (!story) {
      throw new RoomStoreError("INVALID_STORY", "Story text cannot be empty.");
    }

    return story.slice(0, 120);
  }

  private assertHost(participant: RoomParticipantRecord): void {
    if (!participant.isHost) {
      throw new RoomStoreError("NOT_HOST", "Only the host can perform that action.");
    }
  }

  private createUniqueRoomId(): string {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = this.nextRoomId();
      if (!this.rooms.has(candidate)) {
        return candidate;
      }
    }

    throw new Error("Unable to allocate a unique room id.");
  }

  private nextId(): string {
    return this.idFactory();
  }

  private nextRoomId(): string {
    return this.roomIdFactory();
  }

  private nowIso(): string {
    return this.now().toISOString();
  }
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createRoomCode(): string {
  const characters = Array.from({ length: 8 }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]);
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}
