import { startTransition, useEffect, useRef, useState } from "react";
import type {
  RoomSnapshot,
  ThrowableReactionEmoji,
  VoteCard as VoteValue,
} from "@lealplanningpoker/shared";
import { buildRoomViewModel, type RoomViewModel } from "../lib/roomView";
import {
  createRoom,
  finalizeStory,
  joinRoom,
  renameParticipant,
  resetVotes,
  revealVotes,
  saveStory,
  submitVote,
  subscribeToRoom,
  syncRoom,
  throwReaction,
  transferHost,
  type RoomSubscription,
} from "../lib/roomTransport";
import { asRoomRequestError, extractRoomParticipant } from "../lib/roomRequest";
import { buildRoomLink, clearRoomQuery } from "../lib/roomUrl";
import { resolveHostTokenAfterJoin } from "../lib/session";
import type { PublicPage } from "../lib/publicPages";
import type { LocalStorageSessionApi } from "./useLocalStorageSession";
import type { NoticeApi } from "./useNotice";

export interface RoomSessionOptions {
  session: LocalStorageSessionApi;
  showNotice: NoticeApi["showNotice"];
  clearNotice: NoticeApi["clearNotice"];
  publicPage: PublicPage;
}

export interface RoomSessionApi {
  snapshot: RoomSnapshot | null;
  viewModel: RoomViewModel | null;
  roomLink: string;
  storyDraft: string;
  setStoryDraft: (value: string) => void;
  selectedVote: VoteValue | null;
  busy: boolean;
  createPlanningRoom: () => Promise<void>;
  joinPlanningRoom: () => Promise<void>;
  renameSelf: () => Promise<void>;
  persistStory: () => Promise<void>;
  castVote: (vote: VoteValue) => Promise<void>;
  clearVote: () => Promise<void>;
  sendReaction: (targetParticipantId: string, emoji: ThrowableReactionEmoji) => void;
  changeHost: (targetParticipantId: string) => Promise<void>;
  revealRoomVotes: () => Promise<void>;
  resetRoomVotes: () => Promise<void>;
  finalizeCurrentStory: () => Promise<void>;
  copyRoomLink: () => Promise<void>;
  startNewRoom: () => void;
}

// The core room orchestrator. Owns the live snapshot, optimistic vote state,
// and every host/participant action. The transport subscription (SSE with
// polling fallback) is opened on join and closed on unmount; each incoming
// snapshot is reconciled through `handleSnapshotResponse`, which must update
// `previousSnapshotRef` before `setSnapshot` and only reset the story draft
// when the room or story actually changes.
export function useRoomSession({
  session,
  showNotice,
  clearNotice,
  publicPage,
}: RoomSessionOptions): RoomSessionApi {
  const {
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
  } = session;

  const subscriptionRef = useRef<RoomSubscription | null>(null);
  const previousSnapshotRef = useRef<RoomSnapshot | null>(null);

  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [storyDraft, setStoryDraft] = useState("");
  const [selectedVote, setSelectedVote] = useState<VoteValue | null>(null);
  const [busy, setBusy] = useState(false);

  const viewModel = snapshot ? buildRoomViewModel(snapshot) : null;
  const roomLink = snapshot ? buildRoomLink(snapshot.roomId) : buildRoomLink(roomCode);

  useEffect(
    () => () => {
      subscriptionRef.current?.close();
    },
    [],
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showNotice/startRoomSubscription are actions, not effect triggers
  }, [participantToken, roomCode, shouldRestoreStoredSession]);

  useEffect(() => {
    if (publicPage !== "home" || !initialRoomQuery || shouldRestoreStoredSession) {
      return;
    }

    if (!displayName) {
      return;
    }

    void joinPlanningRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only auto-join; deps intentionally empty
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
        clearSession();
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
      roomId: nextRoomId,
    });
  }

  function handleSnapshotResponse(
    nextSnapshot: RoomSnapshot,
    nextParticipantToken = activeSessionRef.current.participantToken,
  ) {
    const previous = previousSnapshotRef.current;
    previousSnapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
    setRoomCode(nextSnapshot.roomId);
    const nextViewModel = buildRoomViewModel(nextSnapshot);
    const selfParticipant = nextViewModel.participants.find(
      (participant) => participant.id === nextSnapshot.viewer.participantId,
    );
    setSelectedVote(selfParticipant?.visibleVote ?? null);
    if (
      !previous ||
      previous.roomId !== nextSnapshot.roomId ||
      previous.story !== nextSnapshot.story
    ) {
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
        hostName: displayName,
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
        participantToken: participantToken || undefined,
      });

      setParticipantToken(response.participantToken);
      setHostToken(
        resolveHostTokenAfterJoin(response.snapshot.viewer.isHost, response.participantToken),
      );
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
        displayName,
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
        story: storyDraft,
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
        vote,
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
        vote: null,
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

  function sendReaction(targetParticipantId: string, emoji: ThrowableReactionEmoji) {
    if (!snapshot || !participantToken) {
      return;
    }

    void throwReaction(snapshot.roomId, participantToken, {
      emoji,
      targetParticipantId,
    }).catch((error) => {
      const roomError = asRoomRequestError(error);
      showNotice("error", roomError.message);
    });
  }

  async function changeHost(targetParticipantId: string) {
    if (!snapshot || !participantToken) {
      return;
    }

    const claimingHost = targetParticipantId === snapshot.viewer.participantId;
    setBusy(true);
    try {
      const response = await transferHost(snapshot.roomId, participantToken, {
        targetParticipantId,
      });
      handleSnapshotResponse(response.snapshot);
      showNotice("success", claimingHost ? "You are now the host." : "Host transferred.");
    } catch (error) {
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
    previousSnapshotRef.current = null;
    setSnapshot(null);
    clearSession();
    setStoryDraft("");
    setSelectedVote(null);
    clearNotice();
    clearRoomQuery();
  }

  return {
    snapshot,
    viewModel,
    roomLink,
    storyDraft,
    setStoryDraft,
    selectedVote,
    busy,
    createPlanningRoom,
    joinPlanningRoom,
    renameSelf,
    persistStory,
    castVote,
    clearVote,
    sendReaction,
    changeHost,
    revealRoomVotes,
    resetRoomVotes,
    finalizeCurrentStory,
    copyRoomLink,
    startNewRoom,
  };
}
