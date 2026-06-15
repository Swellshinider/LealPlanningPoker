import { startTransition, useEffect, useRef, useState } from "react";
import type { RoomSnapshot, VoteCard as VoteValue } from "@lealplanningpoker/shared";
import { buildRoomViewModel } from "./lib/roomView";
import {
  createRoom,
  finalizeStory,
  getConnectionErrorMessage,
  joinRoom,
  renameParticipant,
  resetVotes,
  revealVotes,
  RoomRequestError,
  saveStory,
  submitVote,
  subscribeToRoom,
  syncRoom,
  type RoomSubscription
} from "./lib/roomTransport";
import { resolveHostTokenAfterJoin, shouldRestoreStoredSessionTokens } from "./lib/session";
import {
  DARK_THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  getSystemTheme,
  getThemeToggleTarget,
  parseThemeMode,
  resolveThemeMode,
  type ThemeMode
} from "./lib/theme";
import { JoinPanel } from "./components/JoinPanel";
import { RoomBoard } from "./components/RoomBoard";

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

function readStoredTheme(): ThemeMode | null {
  try {
    return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}

function readSystemTheme(): ThemeMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return getSystemTheme(window.matchMedia(DARK_THEME_MEDIA_QUERY).matches);
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

function clearRoomQuery(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState(null, "", url.toString());
}

function extractRoomParticipant(snapshot: RoomSnapshot) {
  return snapshot.participants.find((participant) => participant.id === snapshot.viewer.participantId) ?? null;
}

function asRoomRequestError(error: unknown): RoomRequestError {
  if (error instanceof RoomRequestError) {
    return error;
  }

  const message = error instanceof Error ? error.message : getConnectionErrorMessage();
  return new RoomRequestError("UNKNOWN_ERROR", message);
}

export function App() {
  const subscriptionRef = useRef<RoomSubscription | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSnapshotRef = useRef<RoomSnapshot | null>(null);
  const displayNameRef = useRef("");
  const initialRoomQuery = readRoomQuery();
  const storedRoomCode = readStorage("roomCode");
  const storedParticipantToken = readStorage("participantToken");
  const storedHostToken = readStorage("hostToken");
  const storedTheme = readStoredTheme();
  const shouldRestoreStoredSession = shouldRestoreStoredSessionTokens(
    initialRoomQuery,
    storedRoomCode,
    storedParticipantToken
  );
  const activeSessionRef = useRef({
    roomCode: "",
    participantToken: "",
    hostToken: ""
  });

  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [displayName, setDisplayName] = useState(() => readStorage("displayName") || "");
  const [roomCode, setRoomCode] = useState(() => initialRoomQuery || storedRoomCode || "");
  const [participantToken, setParticipantToken] = useState(() =>
    shouldRestoreStoredSession ? storedParticipantToken : ""
  );
  const [hostToken, setHostToken] = useState(() => (shouldRestoreStoredSession ? storedHostToken : ""));
  const [storyDraft, setStoryDraft] = useState("");
  const [selectedVote, setSelectedVote] = useState<VoteValue | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemeMode | null>(() => storedTheme);
  const [theme, setTheme] = useState<ThemeMode>(() => resolveThemeMode(storedTheme, readSystemTheme()));

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
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  useEffect(() => {
    if (themePreference || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DARK_THEME_MEDIA_QUERY);
    const handleThemeChange = (event: MediaQueryListEvent) => {
      setTheme(getSystemTheme(event.matches));
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [themePreference]);

  useEffect(() => () => {
    clearNoticeTimer();
    subscriptionRef.current?.close();
  }, []);

  useEffect(() => {
    if (!shouldRestoreStoredSession || !roomCode || !participantToken) {
      return;
    }

    let cancelled = false;

    const restore = async () => {
      setBusy(true);
      try {
        const response = await syncRoom(roomCode, participantToken);
        if (cancelled) {
          return;
        }

        handleSnapshotResponse(response.snapshot, participantToken);
        startRoomSubscription(roomCode, participantToken);
        showNotice("info", "Session restored.");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const roomError = asRoomRequestError(error);
        showNotice("error", roomError.message);
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [participantToken, roomCode, shouldRestoreStoredSession]);

  useEffect(() => {
    if (!initialRoomQuery || shouldRestoreStoredSession) {
      return;
    }

    const storedName = readStorage("displayName");
    if (!storedName) {
      return;
    }

    void joinPlanningRoom();
  }, []);

  function startRoomSubscription(nextRoomId: string, nextParticipantToken: string) {
    subscriptionRef.current?.close();
    subscriptionRef.current = subscribeToRoom({
      onClosed: (payload) => {
        showNotice("error", payload.error.message);
        subscriptionRef.current?.close();
        subscriptionRef.current = null;
        previousSnapshotRef.current = null;
        setSnapshot(null);
        setRoomCode("");
        setParticipantToken("");
        setHostToken("");
        setSelectedVote(null);
      },
      onError: (error) => {
        showNotice("error", error.message);
      },
      onModeChange: (mode) => {
        if (mode === "polling") {
          showNotice("info", "Live updates are using compatibility polling.");
        }
      },
      onSnapshot: (nextSnapshot) => {
        startTransition(() => {
          handleSnapshotResponse(nextSnapshot, nextParticipantToken);
        });
      },
      participantToken: nextParticipantToken,
      roomId: nextRoomId
    });
  }

  function clearNotice() {
    clearNoticeTimer();
    setNotice(null);
  }

  function clearNoticeTimer() {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }

  function showNotice(tone: NoticeTone, text: string) {
    clearNoticeTimer();
    setNotice({ tone, text });
    noticeTimerRef.current = setTimeout(() => {
      noticeTimerRef.current = null;
      setNotice(null);
    }, 4_000);
  }

  function toggleTheme() {
    const nextTheme = getThemeToggleTarget(theme);
    setThemePreference(nextTheme);
    setTheme(nextTheme);
    writeStoredTheme(nextTheme);
  }

  function handleSnapshotResponse(nextSnapshot: RoomSnapshot, nextParticipantToken = activeSessionRef.current.participantToken) {
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

    setHostToken(resolveHostTokenAfterJoin(nextSnapshot.viewer.isHost, nextParticipantToken));
  }

  async function createPlanningRoom() {
    if (!displayName.trim()) {
      showNotice("error", "Please enter a display name.");
      return;
    }

    setBusy(true);
    try {
      const response = await createRoom({
        hostName: displayName
      });

      setParticipantToken(response.participantToken);
      setHostToken(response.hostToken);
      handleSnapshotResponse(response.snapshot, response.participantToken);
      setDisplayName(extractRoomParticipant(response.snapshot)?.name ?? displayName);
      startRoomSubscription(response.roomId, response.participantToken);
      showNotice("success", "Room created.");
    } catch (error) {
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    } finally {
      setBusy(false);
    }
  }

  async function joinPlanningRoom() {
    if (!roomCode.trim()) {
      return;
    }

    if (!displayName.trim()) {
      showNotice("error", "Please enter a display name.");
      return;
    }

    setBusy(true);
    try {
      const response = await joinRoom(roomCode.trim().toUpperCase(), {
        displayName,
        participantToken: participantToken || undefined
      });

      setParticipantToken(response.participantToken);
      setHostToken(resolveHostTokenAfterJoin(response.snapshot.viewer.isHost, response.participantToken));
      handleSnapshotResponse(response.snapshot, response.participantToken);
      setDisplayName(extractRoomParticipant(response.snapshot)?.name ?? displayName);
      startRoomSubscription(response.roomId, response.participantToken);
      showNotice("success", "Joined room.");
    } catch (error) {
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    } finally {
      setBusy(false);
    }
  }

  async function renameSelf() {
    if (!snapshot || !participantToken) {
      return;
    }

    if (!displayName.trim()) {
      showNotice("error", "Please enter a display name.");
      return;
    }

    setBusy(true);
    try {
      const response = await renameParticipant(snapshot.roomId, participantToken, {
        displayName
      });

      handleSnapshotResponse(response.snapshot);
      setDisplayName(extractRoomParticipant(response.snapshot)?.name ?? displayName);
      showNotice("success", "Name saved.");
    } catch (error) {
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    } finally {
      setBusy(false);
    }
  }

  async function persistStory() {
    if (!snapshot || !hostToken) {
      return;
    }

    setBusy(true);
    try {
      const response = await saveStory(snapshot.roomId, hostToken, {
        story: storyDraft
      });

      handleSnapshotResponse(response.snapshot);
      showNotice("success", "Story saved.");
    } catch (error) {
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    } finally {
      setBusy(false);
    }
  }

  async function castVote(vote: VoteValue) {
    if (!snapshot || !participantToken) {
      return;
    }

    const previousVote = selectedVote;
    setSelectedVote(vote);
    setBusy(true);
    try {
      const response = await submitVote(snapshot.roomId, participantToken, {
        vote
      });

      handleSnapshotResponse(response.snapshot);
    } catch (error) {
      setSelectedVote(previousVote);
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    } finally {
      setBusy(false);
    }
  }

  async function clearVote() {
    if (!snapshot || !participantToken) {
      return;
    }

    const previousVote = selectedVote;
    setSelectedVote(null);
    setBusy(true);
    try {
      const response = await submitVote(snapshot.roomId, participantToken, {
        vote: null
      });
      handleSnapshotResponse(response.snapshot);
    } catch (error) {
      setSelectedVote(previousVote);
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    } finally {
      setBusy(false);
    }
  }

  async function revealRoomVotes() {
    if (!snapshot || !hostToken) {
      return;
    }

    setBusy(true);
    try {
      const response = await revealVotes(snapshot.roomId, hostToken);
      handleSnapshotResponse(response.snapshot);
      showNotice("success", "Votes revealed.");
    } catch (error) {
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetRoomVotes() {
    if (!snapshot || !hostToken) {
      return;
    }

    setBusy(true);
    try {
      const response = await resetVotes(snapshot.roomId, hostToken);
      handleSnapshotResponse(response.snapshot);
      setSelectedVote(null);
      showNotice("success", "Votes cleared.");
    } catch (error) {
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    } finally {
      setBusy(false);
    }
  }

  async function finalizeCurrentStory() {
    if (!snapshot || !hostToken) {
      return;
    }

    setBusy(true);
    try {
      const response = await finalizeStory(snapshot.roomId, hostToken);
      handleSnapshotResponse(response.snapshot);
      showNotice("success", "Story finalized.");
    } catch (error) {
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
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
      showNotice("success", "Room link copied.");
    } catch {
      showNotice("info", link);
    }
  }

  function startNewRoom() {
    subscriptionRef.current?.close();
    subscriptionRef.current = null;
    activeSessionRef.current = {
      roomCode: "",
      participantToken: "",
      hostToken: ""
    };
    previousSnapshotRef.current = null;
    setSnapshot(null);
    setRoomCode("");
    setParticipantToken("");
    setHostToken("");
    setStoryDraft("");
    setSelectedVote(null);
    clearNotice();
    writeStorage("roomCode", "");
    writeStorage("participantToken", "");
    writeStorage("hostToken", "");
    clearRoomQuery();
  }

  const bannerText = notice ? notice.text : null;
  const bannerTone = notice?.tone ?? "info";

  if (!snapshot || !viewModel) {
    return (
      <main className="app-shell">
        <JoinPanel
          busy={busy}
          displayName={displayName}
          roomCode={roomCode}
          theme={theme}
          autoFocusName={Boolean(roomCode) && !displayName.trim()}
          onCreateRoom={() => void createPlanningRoom()}
          onDisplayNameChange={setDisplayName}
          onJoinRoom={() => void joinPlanningRoom()}
          onRoomCodeChange={setRoomCode}
          onToggleTheme={toggleTheme}
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
        selectedVote={selectedVote}
        storyDraft={storyDraft}
        theme={theme}
        roomLink={roomLink}
        viewModel={viewModel}
        onCopyLink={() => void copyRoomLink()}
        onDisplayNameChange={setDisplayName}
        onFinalize={() => void finalizeCurrentStory()}
        onNewRoom={startNewRoom}
        onRename={() => void renameSelf()}
        onReset={() => void resetRoomVotes()}
        onReveal={() => void revealRoomVotes()}
        onSaveStory={() => void persistStory()}
        onStoryChange={setStoryDraft}
        onToggleTheme={toggleTheme}
        onVote={(vote) => void castVote(vote)}
        onClearVote={() => void clearVote()}
      />
      {bannerText ? <div className={`floating-banner floating-banner--${bannerTone}`}>{bannerText}</div> : null}
    </main>
  );
}
