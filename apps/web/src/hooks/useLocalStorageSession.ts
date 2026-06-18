import { type MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { readPathname, readRoomQuery } from "../lib/roomUrl";
import { shouldRestoreStoredSessionTokens } from "../lib/session";

const STORAGE_KEYS = {
  displayName: "lpp.displayName",
  roomCode: "lpp.roomCode",
  participantToken: "lpp.participantToken",
  hostToken: "lpp.hostToken",
} as const;

function readStorage(key: keyof typeof STORAGE_KEYS): string {
  try {
    return window.localStorage.getItem(STORAGE_KEYS[key]) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: keyof typeof STORAGE_KEYS, value: string): void {
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEYS[key], value);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS[key]);
    }
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}

export interface SessionIdentity {
  roomCode: string;
  participantToken: string;
  hostToken: string;
}

export interface LocalStorageSessionApi {
  displayName: string;
  setDisplayName: (value: string) => void;
  roomCode: string;
  setRoomCode: (value: string) => void;
  participantToken: string;
  setParticipantToken: (value: string) => void;
  hostToken: string;
  setHostToken: (value: string) => void;
  displayNameRef: MutableRefObject<string>;
  activeSessionRef: MutableRefObject<SessionIdentity>;
  clearSession: () => void;
  initialRoomQuery: string;
  shouldRestoreStoredSession: boolean;
}

// Owns the localStorage-backed session identity (display name + room code +
// participant/host tokens) and the derived "should we resume the stored
// session?" precondition. Every change is mirrored to localStorage, and
// `activeSessionRef` is kept in sync so async handlers can read the current
// identity without stale closures. `clearSession` resets the identity and is
// shared by the room-closed and start-new-room flows.
export function useLocalStorageSession(): LocalStorageSessionApi {
  const initialRoomQuery = readRoomQuery();
  const pathname = readPathname();
  const storedRoomCode = readStorage("roomCode");
  const storedParticipantToken = readStorage("participantToken");
  const storedHostToken = readStorage("hostToken");
  const shouldRestoreStoredSession = shouldRestoreStoredSessionTokens(
    pathname,
    initialRoomQuery,
    storedRoomCode,
    storedParticipantToken,
  );

  const displayNameRef = useRef("");
  const activeSessionRef = useRef<SessionIdentity>({
    roomCode: "",
    participantToken: "",
    hostToken: "",
  });

  const [displayName, setDisplayName] = useState(() => readStorage("displayName") || "");
  const [roomCode, setRoomCode] = useState(() => initialRoomQuery || storedRoomCode || "");
  const [participantToken, setParticipantToken] = useState(() =>
    shouldRestoreStoredSession ? storedParticipantToken : "",
  );
  const [hostToken, setHostToken] = useState(() =>
    shouldRestoreStoredSession ? storedHostToken : "",
  );

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    activeSessionRef.current = {
      roomCode,
      participantToken,
      hostToken,
    };

    writeStorage("displayName", displayName);
    writeStorage("roomCode", roomCode);
    writeStorage("participantToken", participantToken);
    writeStorage("hostToken", hostToken);
  }, [displayName, hostToken, participantToken, roomCode]);

  const clearSession = useCallback(() => {
    setRoomCode("");
    setParticipantToken("");
    setHostToken("");
    activeSessionRef.current = {
      roomCode: "",
      participantToken: "",
      hostToken: "",
    };
  }, []);

  return {
    displayName,
    setDisplayName,
    roomCode,
    setRoomCode,
    participantToken,
    setParticipantToken,
    hostToken,
    setHostToken,
    displayNameRef,
    activeSessionRef,
    clearSession,
    initialRoomQuery,
    shouldRestoreStoredSession,
  };
}
