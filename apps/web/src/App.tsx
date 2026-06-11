import { startTransition, useEffect, useRef, useState } from "react";
import type { RoomSnapshot, VoteCard as VoteValue } from "@lealplanningpoker/shared";
import { buildRoomViewModel } from "./lib/roomView";
import { createRoomSocket, ensureSocketConnected, emitWithAck, type RoomSocketError } from "./lib/socket";
import { JoinPanel } from "./components/JoinPanel";
import { RoomBoard } from "./components/RoomBoard";
import type { Socket } from "socket.io-client";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";
type NoticeTone = "info" | "success" | "error";

interface Notice {
  tone: NoticeTone;
  text: string;
}

const STORAGE_KEYS = {
  displayName: "lpp.displayName",
  roomCode: "lpp.roomCode",
  participantToken: "lpp.participantToken",
  hostToken: "lpp.hostToken"
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

function readRoomQuery(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const value = new URLSearchParams(window.location.search).get("room") ?? "";
  return value.toUpperCase();
}

function buildRoomLink(roomCode: string): string {
  if (typeof window === "undefined" || !roomCode) {
    return "";
  }

  const url = new URL(window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function extractRoomParticipant(snapshot: RoomSnapshot) {
  return snapshot.participants.find((participant) => participant.id === snapshot.viewer.participantId) ?? null;
}

function asRoomSocketError(error: unknown): RoomSocketError {
  if (error instanceof Error && "code" in error) {
    return error as RoomSocketError;
  }

  const message = error instanceof Error ? error.message : "Unexpected room error.";
  return Object.assign(new Error(message), { code: "UNKNOWN_ERROR" }) as RoomSocketError;
}

export function App() {
  const socketRef = useRef<Socket | null>(null);
  const previousSnapshotRef = useRef<RoomSnapshot | null>(null);
  const displayNameRef = useRef("");
  const activeSessionRef = useRef({
    roomCode: "",
    participantToken: "",
    hostToken: ""
  });

  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [displayName, setDisplayName] = useState(() => readStorage("displayName") || "");
  const [roomCode, setRoomCode] = useState(() => readRoomQuery() || readStorage("roomCode") || "");
  const [participantToken, setParticipantToken] = useState(() => readStorage("participantToken") || "");
  const [hostToken, setHostToken] = useState(() => readStorage("hostToken") || "");
  const [storyDraft, setStoryDraft] = useState("");
  const [selectedVote, setSelectedVote] = useState<VoteValue | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const viewModel = snapshot ? buildRoomViewModel(snapshot) : null;
  const roomLink = snapshot ? buildRoomLink(snapshot.roomId) : buildRoomLink(roomCode);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    activeSessionRef.current = {
      roomCode,
      participantToken,
      hostToken
    };

    writeStorage("displayName", displayName);
    writeStorage("roomCode", roomCode);
    writeStorage("participantToken", participantToken);
    writeStorage("hostToken", hostToken);
  }, [displayName, hostToken, participantToken, roomCode]);

  useEffect(() => {
    const socket = createRoomSocket();
    socketRef.current = socket;

    const handleSnapshot = (nextSnapshot: RoomSnapshot) => {
      startTransition(() => {
        const previous = previousSnapshotRef.current;
        previousSnapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
        setRoomCode(nextSnapshot.roomId);

        const nextViewModel = buildRoomViewModel(nextSnapshot);
        const selfParticipant = nextViewModel.participants.find(
          (participant) => participant.id === nextSnapshot.viewer.participantId
        );
        setSelectedVote(selfParticipant?.visibleVote ?? null);

        if (!previous || previous.roomId !== nextSnapshot.roomId || previous.story !== nextSnapshot.story) {
          setStoryDraft(nextSnapshot.story);
        }

        if (!displayNameRef.current && selfParticipant?.name) {
          setDisplayName(selfParticipant.name);
        }
      });
      setNotice(null);
      setConnectionState("connected");
    };

    const handleClosed = (payload: { roomId: string; error: { code: string; message: string } }) => {
      setNotice({
        tone: "error",
        text: payload.error.message
      });
      setSnapshot(null);
      setRoomCode("");
      setParticipantToken("");
      setHostToken("");
      setSelectedVote(null);
    };

    const handleRoomError = (payload: { code: string; message: string }) => {
      setNotice({
        tone: "error",
        text: payload.message
      });
    };

    const handleConnect = () => {
      setConnectionState("connected");
      const session = activeSessionRef.current;
      if (session.roomCode && session.participantToken) {
        void syncStoredSession(socket, session.roomCode, session.participantToken);
      }
    };

    const handleDisconnect = () => {
      setConnectionState("reconnecting");
    };

    socket.on("room:snapshot", handleSnapshot);
    socket.on("room:closed", handleClosed);
    socket.on("room:error", handleRoomError);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", () => {
      setConnectionState("disconnected");
      setNotice({
        tone: "error",
        text: "Socket connection failed."
      });
    });

    socket.connect();

    return () => {
      socket.off("room:snapshot", handleSnapshot);
      socket.off("room:closed", handleClosed);
      socket.off("room:error", handleRoomError);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
    };
  }, []);

  async function syncStoredSession(socket: Socket, room: string, token: string) {
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{ snapshot: RoomSnapshot }>(socket, "room:sync", {
        roomId: room,
        participantToken: token
      });
      handleSnapshotResponse(response.snapshot);
      setNotice({
        tone: "info",
        text: "Session restored."
      });
    } catch (error) {
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    }
  }

  function handleSnapshotResponse(nextSnapshot: RoomSnapshot) {
    const previous = previousSnapshotRef.current;
    previousSnapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
    setRoomCode(nextSnapshot.roomId);
    const nextViewModel = buildRoomViewModel(nextSnapshot);
    const selfParticipant = nextViewModel.participants.find(
      (participant) => participant.id === nextSnapshot.viewer.participantId
    );
    setSelectedVote(selfParticipant?.visibleVote ?? null);
    if (!previous || previous.roomId !== nextSnapshot.roomId || previous.story !== nextSnapshot.story) {
      setStoryDraft(nextSnapshot.story);
    }
    if (!displayNameRef.current && selfParticipant?.name) {
      setDisplayName(selfParticipant.name);
    }
  }

  async function createRoom() {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    setBusy(true);
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{
        roomId: string;
        participantToken: string;
        hostToken: string;
        snapshot: RoomSnapshot;
      }>(socket, "room:create", {
        hostName: displayName || "Anonymous"
      });

      setParticipantToken(response.participantToken);
      setHostToken(response.hostToken);
      handleSnapshotResponse(response.snapshot);
      setDisplayName(extractRoomParticipant(response.snapshot)?.name ?? displayName);
      setNotice({
        tone: "success",
        text: "Room created."
      });
    } catch (error) {
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    const socket = socketRef.current;
    if (!socket || !roomCode.trim()) {
      return;
    }

    setBusy(true);
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{
        roomId: string;
        participantToken: string;
        snapshot: RoomSnapshot;
      }>(socket, "room:join", {
        roomId: roomCode.trim().toUpperCase(),
        displayName: displayName || "Anonymous",
        participantToken: participantToken || undefined
      });

      setParticipantToken(response.participantToken);
      setHostToken(response.participantToken);
      handleSnapshotResponse(response.snapshot);
      setDisplayName(extractRoomParticipant(response.snapshot)?.name ?? displayName);
      setNotice({
        tone: "success",
        text: "Joined room."
      });
    } catch (error) {
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function renameSelf() {
    if (!snapshot || !participantToken) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    setBusy(true);
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{ snapshot: RoomSnapshot }>(socket, "participant:rename", {
        roomId: snapshot.roomId,
        participantToken,
        displayName: displayName || "Anonymous"
      });

      handleSnapshotResponse(response.snapshot);
      setDisplayName(extractRoomParticipant(response.snapshot)?.name ?? displayName);
      setNotice({
        tone: "success",
        text: "Name saved."
      });
    } catch (error) {
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveStory() {
    if (!snapshot || !hostToken) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    setBusy(true);
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{ snapshot: RoomSnapshot }>(socket, "host:story:set", {
        roomId: snapshot.roomId,
        hostToken,
        story: storyDraft
      });

      handleSnapshotResponse(response.snapshot);
      setNotice({
        tone: "success",
        text: "Story saved."
      });
    } catch (error) {
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitVote(vote: VoteValue) {
    if (!snapshot || !participantToken) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    const previousVote = selectedVote;
    setSelectedVote(vote);
    setBusy(true);
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{ snapshot: RoomSnapshot }>(socket, "vote:submit", {
        roomId: snapshot.roomId,
        participantToken,
        vote
      });

      handleSnapshotResponse(response.snapshot);
    } catch (error) {
      setSelectedVote(previousVote);
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function revealVotes() {
    if (!snapshot || !hostToken) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    setBusy(true);
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{ snapshot: RoomSnapshot }>(socket, "host:reveal", {
        roomId: snapshot.roomId,
        hostToken
      });

      handleSnapshotResponse(response.snapshot);
      setNotice({
        tone: "success",
        text: "Votes revealed."
      });
    } catch (error) {
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function resetVotes() {
    if (!snapshot || !hostToken) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    setBusy(true);
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{ snapshot: RoomSnapshot }>(socket, "host:reset", {
        roomId: snapshot.roomId,
        hostToken
      });

      handleSnapshotResponse(response.snapshot);
      setSelectedVote(null);
      setNotice({
        tone: "success",
        text: "Round reset."
      });
    } catch (error) {
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function finalizeStory() {
    if (!snapshot || !hostToken) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    setBusy(true);
    try {
      await ensureSocketConnected(socket);
      const response = await emitWithAck<{ snapshot: RoomSnapshot }>(socket, "host:finalize", {
        roomId: snapshot.roomId,
        hostToken
      });

      handleSnapshotResponse(response.snapshot);
      setNotice({
        tone: "success",
        text: "Story finalized."
      });
    } catch (error) {
      const roomError = asRoomSocketError(error);
      setNotice({
        tone: "error",
        text: roomError.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function copyRoomLink() {
    const link = roomLink;
    if (!link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setNotice({
        tone: "success",
        text: "Room link copied."
      });
    } catch {
      setNotice({
        tone: "info",
        text: link
      });
    }
  }

  const bannerText = notice ? notice.text : null;
  const bannerTone = notice?.tone ?? "info";

  if (!snapshot || !viewModel) {
    return (
      <main className="app-shell">
        <JoinPanel
          busy={busy}
          connectionState={connectionState}
          displayName={displayName}
          notice={bannerText}
          roomCode={roomCode}
          onCreateRoom={() => void createRoom()}
          onDisplayNameChange={setDisplayName}
          onJoinRoom={() => void joinRoom()}
          onRoomCodeChange={setRoomCode}
        />
        {bannerText ? <div className={`floating-banner floating-banner--${bannerTone}`}>{bannerText}</div> : null}
      </main>
    );
  }

  return (
    <main className="app-shell app-shell--room">
      <RoomBoard
        busy={busy}
        displayName={displayName}
        history={snapshot.history}
        notice={bannerText}
        roomLink={roomLink}
        selectedVote={selectedVote}
        storyDraft={storyDraft}
        viewModel={viewModel}
        onCopyLink={() => void copyRoomLink()}
        onDisplayNameChange={setDisplayName}
        onFinalize={() => void finalizeStory()}
        onRename={() => void renameSelf()}
        onReset={() => void resetVotes()}
        onReveal={() => void revealVotes()}
        onSaveStory={() => void saveStory()}
        onStoryChange={setStoryDraft}
        onVote={(vote) => void submitVote(vote)}
      />
      {bannerText ? <div className={`floating-banner floating-banner--${bannerTone}`}>{bannerText}</div> : null}
    </main>
  );
}
