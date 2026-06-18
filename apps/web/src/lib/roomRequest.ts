import type { RoomSnapshot } from "@lealplanningpoker/shared";
import { RoomRequestError, getConnectionErrorMessage } from "./roomTransport";

// NOTE: this is intentionally a SECOND `asRoomRequestError`, separate from the
// private one in roomTransport.ts. That one defaults to "NETWORK_ERROR" for
// transport-layer failures; this one defaults to "UNKNOWN_ERROR" for the
// user-initiated actions surfaced in the UI. Do not merge them.

export function extractRoomParticipant(snapshot: RoomSnapshot) {
  return (
    snapshot.participants.find((participant) => participant.id === snapshot.viewer.participantId) ??
    null
  );
}

export function asRoomRequestError(error: unknown): RoomRequestError {
  if (error instanceof RoomRequestError) {
    return error;
  }

  const message = error instanceof Error ? error.message : getConnectionErrorMessage();
  return new RoomRequestError("UNKNOWN_ERROR", message);
}
