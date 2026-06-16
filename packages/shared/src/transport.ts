import type { VoteCard } from "./deck.js";
import type { RoomSnapshot, ThrowableReactionEmoji } from "./room.js";

export interface RoomErrorPayload {
  code: string;
  message: string;
}

export type RoomActionSuccessEnvelope<T extends object> = {
  ok: true;
} & T;

export interface RoomActionFailureEnvelope {
  ok: false;
  error: RoomErrorPayload;
}

export type RoomActionEnvelope<T extends object> =
  | RoomActionSuccessEnvelope<T>
  | RoomActionFailureEnvelope;

export interface CreateRoomRequest {
  hostName: string;
}

export interface JoinRoomRequest {
  displayName: string;
  participantToken?: string;
}

export interface RenameParticipantRequest {
  displayName: string;
}

export interface VoteRequest {
  vote: VoteCard | null;
}

export interface StoryRequest {
  story: string;
}

export interface ThrowReactionRequest {
  targetParticipantId: string;
  emoji: ThrowableReactionEmoji;
}

export interface RoomClosedEvent {
  roomId: string;
  error: RoomErrorPayload;
}

export type RoomEventEnvelope =
  | {
      type: "snapshot";
      snapshot: RoomSnapshot;
    }
  | ({
      type: "closed";
    } & RoomClosedEvent)
  | {
      type: "error";
      error: RoomErrorPayload;
    };
