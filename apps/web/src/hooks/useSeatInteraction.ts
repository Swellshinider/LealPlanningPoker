import { type MutableRefObject, useEffect, useRef, useState } from "react";
import type { RoomActiveReactionSnapshot } from "@lealplanningpoker/shared";
import type { RoomParticipantView } from "../lib/roomView";
import {
  deriveReactionPhase,
  filterExpiredReactions,
  getQuadraticPoint,
  getReactionPanelGeometry,
  type Point,
  type ReactionPhaseState,
} from "../lib/reactionOverlay";

const REACTION_POPOVER_CLOSE_DELAY_MS = 140;
const HOST_ACTION_CLOSE_DELAY_MS = 140;

export interface RenderedReaction {
  geometry: { start: Point; end: Point; control: Point };
  phaseState: ReactionPhaseState;
  point: Point;
  reaction: RoomActiveReactionSnapshot;
}

export interface SeatInteractionOptions {
  participants: RoomParticipantView[];
  activeReactions: RoomActiveReactionSnapshot[];
  isHost: boolean;
}

export interface SeatInteractionApi {
  stageRef: MutableRefObject<HTMLDivElement | null>;
  activeReactionTargetId: string | null;
  activeHostActionParticipantId: string | null;
  renderedReactions: RenderedReaction[];
  bumpedTargets: Set<string>;
  registerHeadElement: (participantId: string, element: HTMLElement | null) => void;
  registerSeatElement: (participantId: string, element: HTMLElement | null) => void;
  openReactionPopoverFor: (participantId: string) => void;
  scheduleReactionPopoverClose: (participantId: string) => void;
  dismissReactionPopover: () => void;
  toggleReactionPopover: (participantId: string) => void;
  openHostActionFor: (participantId: string) => void;
  scheduleHostActionClose: (participantId: string) => void;
  dismissHostAction: () => void;
}

// Owns the reaction-popover and host-action interaction state for the seat
// table: which popover/action is open, their delayed-close timers, the DOM
// element refs needed to position flying reactions, the 50ms reaction clock,
// and the dismiss-on-outside-click/Escape/when-target-disappears effects. Also
// derives the rendered reaction projectiles each render from the live element
// rects so PokerTable/ReactionOverlay can paint them.
export function useSeatInteraction({
  participants,
  activeReactions,
  isHost,
}: SeatInteractionOptions): SeatInteractionApi {
  const [activeReactionTargetId, setActiveReactionTargetId] = useState<string | null>(null);
  const [activeHostActionParticipantId, setActiveHostActionParticipantId] = useState<string | null>(
    null,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const stageRef = useRef<HTMLDivElement | null>(null);
  const reactionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hostActionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headElementsRef = useRef(new Map<string, HTMLElement>());
  const seatElementsRef = useRef(new Map<string, HTMLElement>());
  const reactionTargets = participants.filter(
    (participant) => participant.connected && !participant.isSelf,
  );
  const visibleReactions = filterExpiredReactions(activeReactions, nowMs);

  useEffect(() => {
    if (typeof window === "undefined" || visibleReactions.length === 0) {
      return undefined;
    }

    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 50);

    return () => {
      window.clearInterval(timer);
    };
  }, [visibleReactions.length, activeReactions]);

  useEffect(
    () => () => {
      clearReactionCloseTimer();
      clearHostActionCloseTimer();
    },
    [],
  );

  useEffect(() => {
    if (!activeReactionTargetId) {
      return;
    }

    const targetStillVisible = reactionTargets.some(
      (participant) => participant.id === activeReactionTargetId,
    );
    if (!targetStillVisible) {
      dismissReactionPopover();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismissReactionPopover only uses stable setState/refs
  }, [activeReactionTargetId, reactionTargets]);

  useEffect(() => {
    if (!activeHostActionParticipantId) {
      return;
    }

    const targetStillVisible = isHost
      ? participants.some(
          (participant) =>
            participant.id === activeHostActionParticipantId &&
            participant.connected &&
            !participant.isSelf,
        )
      : false;
    if (!targetStillVisible) {
      dismissHostAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismissHostAction only uses stable setState/refs
  }, [activeHostActionParticipantId, isHost, participants]);

  useEffect(() => {
    if (!activeReactionTargetId || typeof document === "undefined") {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-reaction-region='true']")) {
        dismissReactionPopover();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissReactionPopover();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismissReactionPopover only uses stable setState/refs
  }, [activeReactionTargetId]);

  useEffect(() => {
    if (!activeHostActionParticipantId || typeof document === "undefined") {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-host-action-region='true']")) {
        dismissHostAction();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissHostAction();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismissHostAction only uses stable setState/refs
  }, [activeHostActionParticipantId]);

  function clearReactionCloseTimer() {
    if (reactionCloseTimerRef.current) {
      clearTimeout(reactionCloseTimerRef.current);
      reactionCloseTimerRef.current = null;
    }
  }

  function clearHostActionCloseTimer() {
    if (hostActionCloseTimerRef.current) {
      clearTimeout(hostActionCloseTimerRef.current);
      hostActionCloseTimerRef.current = null;
    }
  }

  function openReactionPopoverFor(targetParticipantId: string) {
    clearReactionCloseTimer();
    setActiveHostActionParticipantId((current) =>
      current === targetParticipantId ? null : current,
    );
    setActiveReactionTargetId(targetParticipantId);
  }

  function scheduleReactionPopoverClose(targetParticipantId: string) {
    clearReactionCloseTimer();
    reactionCloseTimerRef.current = setTimeout(() => {
      reactionCloseTimerRef.current = null;
      setActiveReactionTargetId((current) => (current === targetParticipantId ? null : current));
    }, REACTION_POPOVER_CLOSE_DELAY_MS);
  }

  function dismissReactionPopover() {
    clearReactionCloseTimer();
    setActiveReactionTargetId(null);
  }

  function toggleReactionPopover(targetParticipantId: string) {
    clearReactionCloseTimer();
    setActiveReactionTargetId((current) =>
      current === targetParticipantId ? null : targetParticipantId,
    );
  }

  function openHostActionFor(targetParticipantId: string) {
    clearHostActionCloseTimer();
    setActiveHostActionParticipantId(targetParticipantId);
  }

  function scheduleHostActionClose(targetParticipantId: string) {
    clearHostActionCloseTimer();
    hostActionCloseTimerRef.current = setTimeout(() => {
      hostActionCloseTimerRef.current = null;
      setActiveHostActionParticipantId((current) =>
        current === targetParticipantId ? null : current,
      );
    }, HOST_ACTION_CLOSE_DELAY_MS);
  }

  function dismissHostAction() {
    clearHostActionCloseTimer();
    setActiveHostActionParticipantId(null);
  }

  function registerSeatElement(participantId: string, element: HTMLElement | null) {
    if (element) {
      seatElementsRef.current.set(participantId, element);
      return;
    }

    seatElementsRef.current.delete(participantId);
  }

  function registerHeadElement(participantId: string, element: HTMLElement | null) {
    if (element) {
      headElementsRef.current.set(participantId, element);
      return;
    }

    headElementsRef.current.delete(participantId);
  }

  const stageElement = stageRef.current;
  const renderedReactions: RenderedReaction[] = stageElement
    ? visibleReactions.flatMap((reaction) => {
        const throwerSeat = seatElementsRef.current.get(reaction.throwerParticipantId);
        const targetHead = headElementsRef.current.get(reaction.targetParticipantId);
        if (!throwerSeat || !targetHead) {
          return [];
        }

        const phaseState = deriveReactionPhase(reaction, nowMs);
        if (phaseState.phase === "expired") {
          return [];
        }

        const geometry = getReactionPanelGeometry({
          panelRect: stageElement.getBoundingClientRect(),
          targetHeadRect: targetHead.getBoundingClientRect(),
          throwerSeatRect: throwerSeat.getBoundingClientRect(),
        });

        return [
          {
            geometry,
            phaseState,
            point: getQuadraticPoint(phaseState.progress, geometry),
            reaction,
          },
        ];
      })
    : [];

  const bumpedTargets = new Set(
    renderedReactions
      .filter(({ phaseState }) => phaseState.phase === "impact")
      .map(({ reaction }) => reaction.targetParticipantId),
  );

  return {
    stageRef,
    activeReactionTargetId,
    activeHostActionParticipantId,
    renderedReactions,
    bumpedTargets,
    registerHeadElement,
    registerSeatElement,
    openReactionPopoverFor,
    scheduleReactionPopoverClose,
    dismissReactionPopover,
    toggleReactionPopover,
    openHostActionFor,
    scheduleHostActionClose,
    dismissHostAction,
  };
}
