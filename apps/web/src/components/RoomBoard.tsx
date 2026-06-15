import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  FIBONACCI_DECK,
  MAX_CUSTOM_VOTE_DIGITS,
  THROWABLE_REACTION_EMOJIS,
  isBuiltInVoteCard,
  normalizeVoteCard,
  type RoomHistoryEntry,
  type ThrowableReactionEmoji,
  type VoteCard as VoteValue
} from "@lealplanningpoker/shared";
import type { RoomParticipantView, RoomViewModel } from "../lib/roomView";
import {
  deriveReactionPhase,
  filterExpiredReactions,
  getQuadraticPoint,
  getReactionPanelGeometry
} from "../lib/reactionOverlay";
import type { ThemeMode } from "../lib/theme";
import { formatVoteLabel } from "../lib/uiText";
import { HistoryPanel } from "./HistoryPanel";
import { QrCodeModal } from "./QrCodeModal";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { VoteCard } from "./VoteCard";

export interface RoomBoardProps {
  viewModel: RoomViewModel;
  history: RoomHistoryEntry[];
  displayName: string;
  storyDraft: string;
  selectedVote: VoteValue | null;
  theme: ThemeMode;
  roomLink: string;
  busy?: boolean;
  onDisplayNameChange: (value: string) => void;
  onRename: () => void;
  onStoryChange: (value: string) => void;
  onSaveStory: () => void;
  onVote: (vote: VoteValue) => void;
  onClearVote: () => void;
  onReveal: () => void;
  onReset: () => void;
  onFinalize: () => void;
  onThrowReaction: (targetParticipantId: string, emoji: ThrowableReactionEmoji) => void;
  onCopyLink: () => void;
  onNewRoom: () => void;
  onToggleTheme: () => void;
}

const DECK: VoteValue[] = [...FIBONACCI_DECK];
const MAX_TABLE_SEATS = 12;

type SeatStyle = CSSProperties & {
  "--seat-x": string;
  "--seat-y": string;
  "--seat-delay": string;
};

interface SeatGeometry {
  style: SeatStyle;
  zoneClass: string;
}

interface PlayerSeatProps {
  participant: RoomParticipantView;
  variant: "ring" | "bench";
  geometry?: SeatGeometry;
  isReactionTarget: boolean;
  isReactionPopoverOpen: boolean;
  isHeadBumped: boolean;
  onCloseReactionPopover: () => void;
  onOpenReactionPopover: () => void;
  onThrowReaction: (emoji: ThrowableReactionEmoji) => void;
  onToggleReactionPopover: () => void;
  registerHeadElement: (participantId: string, element: HTMLElement | null) => void;
  registerSeatElement: (participantId: string, element: HTMLElement | null) => void;
}

function getSeatGeometry(index: number, total: number): SeatGeometry {
  const angle = total === 1 ? 90 : -90 + (360 / total) * index;
  const radians = (angle * Math.PI) / 180;
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const zoneClass =
    normalizedAngle >= 45 && normalizedAngle <= 135
      ? "table-seat--lower"
      : normalizedAngle >= 225 && normalizedAngle <= 315
        ? "table-seat--upper"
        : normalizedAngle > 135 && normalizedAngle < 225
          ? "table-seat--left"
          : "table-seat--right";

  return {
    style: {
      "--seat-x": `${(x * 42).toFixed(3)}%`,
      "--seat-y": `${(y * 38).toFixed(3)}%`,
      "--seat-delay": `${index * 42}ms`
    },
    zoneClass
  };
}

function getPlayerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`
      : (words[0] ?? "").slice(0, 2);

  return initials.toUpperCase() || "?";
}

function getPlayerStatus(participant: RoomParticipantView): string {
  const role = participant.isHost ? "Host" : "Player";
  return `${role}, ${participant.connected ? "online" : "offline"}`;
}

function formatAverage(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatConfidence(value: number | null): string {
  return value === null ? "-" : `${value}%`;
}

function PlayerSeat({
  participant,
  variant,
  geometry,
  isReactionTarget,
  isReactionPopoverOpen,
  isHeadBumped,
  onCloseReactionPopover,
  onOpenReactionPopover,
  onThrowReaction,
  onToggleReactionPopover,
  registerHeadElement,
  registerSeatElement
}: PlayerSeatProps) {
  const hasFaceDownCard = participant.hasVoted && !participant.tableVote;
  const hasFaceUpCard = Boolean(participant.tableVote);
  const initials = getPlayerInitials(participant.name);
  const headClassName = [
    "player-seat__head",
    isHeadBumped ? "player-seat__head--bumped" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      ref={(element) => registerSeatElement(participant.id, element)}
      className={[
        "table-seat",
        variant === "ring" ? "table-seat--ring" : "table-seat--bench",
        geometry?.zoneClass ?? "",
        participant.isHost ? "table-seat--host" : "",
        participant.connected ? "" : "table-seat--offline",
        hasFaceUpCard ? "has-face-up-card" : "",
        hasFaceDownCard ? "has-face-down-card" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      style={geometry?.style}
      aria-label={`${participant.name} seat`}
    >
      <div className="player-seat__person" aria-hidden="true">
        <span className="player-seat__shadow" />
        <span className="player-seat__body" />
        {isReactionTarget ? (
          <div
            className="player-seat__reaction-region"
            data-reaction-region="true"
            onMouseEnter={onOpenReactionPopover}
            onMouseLeave={onCloseReactionPopover}
          >
            <button
              aria-expanded={isReactionPopoverOpen}
              aria-label={`Throw a reaction at ${participant.name}`}
              className="player-seat__head-button"
              data-reaction-trigger="true"
              type="button"
              onPointerDown={(event) => {
                if (event.pointerType !== "mouse") {
                  event.preventDefault();
                  onToggleReactionPopover();
                }
              }}
            >
              <span
                ref={(element) => registerHeadElement(participant.id, element)}
                className={headClassName}
              >
                <span>{initials}</span>
              </span>
            </button>

            <div
              className="reaction-popover"
              hidden={!isReactionPopoverOpen}
              role="menu"
              aria-label={`Reaction choices for ${participant.name}`}
            >
              {THROWABLE_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  aria-label={`Throw ${emoji} at ${participant.name}`}
                  className="reaction-popover__emoji"
                  type="button"
                  onClick={() => onThrowReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span
            ref={(element) => registerHeadElement(participant.id, element)}
            className={headClassName}
          >
            <span>{initials}</span>
          </span>
        )}
      </div>

      <div className="player-seat__plate">
        <strong>{participant.name}</strong>
        <span>{getPlayerStatus(participant)}</span>
      </div>

      <div className="table-card-slot" aria-label={`${participant.name} card`}>
        {hasFaceUpCard && participant.tableVote ? (
          <span className="table-card table-card--front">
            {formatVoteLabel(participant.tableVote)}
          </span>
        ) : hasFaceDownCard ? (
          <span className="table-card table-card--back" aria-hidden="true" />
        ) : (
          <span className="table-card-placeholder" aria-hidden="true" />
        )}
      </div>
    </article>
  );
}

export function RoomBoard({
  viewModel,
  history,
  displayName,
  storyDraft,
  selectedVote,
  theme,
  roomLink,
  busy = false,
  onDisplayNameChange,
  onRename,
  onStoryChange,
  onSaveStory,
  onVote,
  onClearVote,
  onReveal,
  onReset,
  onFinalize,
  onThrowReaction,
  onCopyLink,
  onNewRoom,
  onToggleTheme
}: RoomBoardProps) {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [customVoteDraft, setCustomVoteDraft] = useState("");
  const [activeReactionTargetId, setActiveReactionTargetId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const stageRef = useRef<HTMLDivElement | null>(null);
  const headElementsRef = useRef(new Map<string, HTMLElement>());
  const seatElementsRef = useRef(new Map<string, HTMLElement>());
  const normalizedCustomVote = useMemo(() => normalizeVoteCard(customVoteDraft), [customVoteDraft]);
  const customVote = normalizedCustomVote && /^\d+$/.test(normalizedCustomVote) ? normalizedCustomVote : null;
  const isCustomSelected = Boolean(selectedVote && !isBuiltInVoteCard(selectedVote));
  const tableParticipants = viewModel.participants.slice(0, MAX_TABLE_SEATS);
  const overflowParticipants = viewModel.participants.slice(MAX_TABLE_SEATS);
  const reactionTargets = viewModel.participants.filter(
    (participant) => participant.connected && !participant.isSelf
  );
  const visibleReactions = filterExpiredReactions(viewModel.activeReactions, nowMs);

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
  }, [visibleReactions.length, viewModel.activeReactions]);

  useEffect(() => {
    if (!activeReactionTargetId) {
      return;
    }

    const targetStillVisible = reactionTargets.some(
      (participant) => participant.id === activeReactionTargetId
    );
    if (!targetStillVisible) {
      setActiveReactionTargetId(null);
    }
  }, [activeReactionTargetId, reactionTargets]);

  useEffect(() => {
    if (!activeReactionTargetId || typeof document === "undefined") {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-reaction-region='true']")) {
        setActiveReactionTargetId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveReactionTargetId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeReactionTargetId]);

  function submitCustomVote() {
    if (!customVote) {
      return;
    }

    onVote(customVote);
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
  const renderedReactions = stageElement
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
          throwerSeatRect: throwerSeat.getBoundingClientRect()
        });

        return [
          {
            geometry,
            phaseState,
            point: getQuadraticPoint(phaseState.progress, geometry),
            reaction
          }
        ];
      })
    : [];

  const bumpedTargets = new Set(
    renderedReactions
      .filter(({ phaseState }) => phaseState.phase === "impact")
      .map(({ reaction }) => reaction.targetParticipantId)
  );

  return (
    <div className="room-workspace">
      <header className="workspace-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">LP</span>
          <div>
            <strong>LealPlanningPoker</strong>
            <span>Room {viewModel.roomId}</span>
          </div>
          <button className="button button--quiet button--compact" type="button" onClick={onNewRoom}>
            New room
          </button>
        </div>

        <div className="topbar-actions">
          <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
          <button className="button button--quiet" type="button" onClick={onCopyLink}>
            Copy link
          </button>
          <button className="button button--quiet" type="button" onClick={() => setQrModalOpen(true)}>
            QR
          </button>
        </div>
      </header>

      <section className="room-hero">
        <div className="room-hero__copy">
          <h1 className={viewModel.story ? undefined : "room-hero__room-id"}>
            {viewModel.story || `Room ${viewModel.roomId}`}
          </h1>
        </div>
      </section>

      <main className="workspace-main">
        <div
          className={[
            "workspace-controls",
            viewModel.isHost ? "" : "workspace-controls--profile-only"
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {viewModel.isHost ? (
            <section className="workspace-panel story-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Story</p>
                  <h2>{viewModel.canSetStory ? "Set the next round" : "Story locked"}</h2>
                </div>
              </div>

              <label className="field">
                <span className="field__label">Story / ticket</span>
                <input
                  className="field__input"
                  disabled={!viewModel.canSetStory}
                  placeholder="Improve onboarding flow"
                  value={storyDraft}
                  onChange={(event) => onStoryChange(event.target.value)}
                />
              </label>

              <div className="action-row">
                <button
                  className="button button--secondary"
                  disabled={busy || !viewModel.canSetStory}
                  type="button"
                  onClick={onSaveStory}
                >
                  {viewModel.isFinalized ? "Start next round" : "Start voting"}
                </button>
              </div>
            </section>
          ) : null}

          <section className="workspace-panel profile-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Profile</p>
                <h2>Your display name</h2>
              </div>
            </div>

            <div className="inline-form">
              <label className="field field--inline">
                <span className="field__label">Name</span>
                <input
                  className="field__input"
                  maxLength={32}
                  value={displayName}
                  onChange={(event) => onDisplayNameChange(event.target.value)}
                />
              </label>
              <button className="button button--quiet" disabled={busy} type="button" onClick={onRename}>
                Save
              </button>
            </div>
          </section>
        </div>

        <section className="workspace-panel poker-table-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Vote table</p>
              <h2>{viewModel.participants.length} players</h2>
            </div>
            <span className="phase-chip phase-chip--quiet">{tableParticipants.length} at table</span>
          </div>

          <div ref={stageRef} className="reaction-stage">
            <div className="poker-table" aria-label="Planning poker table">
              <div className="poker-table__surface">
                <div className="poker-table__felt">
                  <span className="poker-table__brand">LEAL</span>
                  {viewModel.resultStats ? (
                    <div className="table-results table-results--felt" aria-label="Round result" aria-live="polite">
                      <div className="table-result">
                        <span>Average</span>
                        <strong>{formatAverage(viewModel.resultStats.average)}</strong>
                      </div>
                      <div className="table-result">
                        <span>Confidence</span>
                        <strong>{formatConfidence(viewModel.resultStats.confidence)}</strong>
                      </div>
                    </div>
                  ) : null}
                  <small>Planning Poker</small>
                </div>
              </div>

              <div className="seat-ring">
                {tableParticipants.map((participant, index) => (
                  <PlayerSeat
                    key={participant.id}
                    geometry={getSeatGeometry(index, tableParticipants.length)}
                    isHeadBumped={bumpedTargets.has(participant.id)}
                    isReactionPopoverOpen={activeReactionTargetId === participant.id}
                    isReactionTarget={participant.connected && !participant.isSelf}
                    participant={participant}
                    registerHeadElement={registerHeadElement}
                    registerSeatElement={registerSeatElement}
                    variant="ring"
                    onCloseReactionPopover={() => setActiveReactionTargetId(null)}
                    onOpenReactionPopover={() => setActiveReactionTargetId(participant.id)}
                    onThrowReaction={(emoji) => {
                      setActiveReactionTargetId(null);
                      onThrowReaction(participant.id, emoji);
                    }}
                    onToggleReactionPopover={() => {
                      setActiveReactionTargetId((current) =>
                        current === participant.id ? null : participant.id
                      );
                    }}
                  />
                ))}
              </div>
            </div>

            {overflowParticipants.length > 0 ? (
              <div className="overflow-bench" aria-label="Overflow players">
                <div className="overflow-bench__header">
                  <span className="section-label">Bench</span>
                  <strong>{overflowParticipants.length} overflow players</strong>
                </div>
                <div className="overflow-bench__list">
                  {overflowParticipants.map((participant) => (
                    <PlayerSeat
                      key={participant.id}
                      isHeadBumped={bumpedTargets.has(participant.id)}
                      isReactionPopoverOpen={activeReactionTargetId === participant.id}
                      isReactionTarget={participant.connected && !participant.isSelf}
                      participant={participant}
                      registerHeadElement={registerHeadElement}
                      registerSeatElement={registerSeatElement}
                      variant="bench"
                      onCloseReactionPopover={() => setActiveReactionTargetId(null)}
                      onOpenReactionPopover={() => setActiveReactionTargetId(participant.id)}
                      onThrowReaction={(emoji) => {
                        setActiveReactionTargetId(null);
                        onThrowReaction(participant.id, emoji);
                      }}
                      onToggleReactionPopover={() => {
                        setActiveReactionTargetId((current) =>
                          current === participant.id ? null : participant.id
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="reaction-stage__overlay" aria-hidden="true">
              {renderedReactions.map(({ geometry, phaseState, point, reaction }) => {
                const lingerOpacity = phaseState.phase === "fade" ? 1 - phaseState.progress : 1;

                return (
                  <div key={reaction.id} className="reaction-overlay">
                    {phaseState.phase === "flight" ? (
                      <span
                        className="reaction-overlay__emoji reaction-overlay__emoji--flight"
                        style={{
                          left: `${point.x}px`,
                          top: `${point.y}px`
                        }}
                      >
                        {reaction.emoji}
                      </span>
                    ) : null}

                    {phaseState.phase === "impact" ? (
                      <>
                        <span
                          className="reaction-overlay__emoji reaction-overlay__emoji--impact"
                          style={{
                            left: `${geometry.end.x}px`,
                            top: `${geometry.end.y}px`
                          }}
                        >
                          {reaction.emoji}
                        </span>
                        <span
                          className="reaction-overlay__burst"
                          style={{
                            left: `${geometry.end.x}px`,
                            top: `${geometry.end.y}px`
                          }}
                        />
                      </>
                    ) : null}

                    {phaseState.phase === "linger" || phaseState.phase === "fade" ? (
                      <span
                        className={[
                          "reaction-overlay__linger",
                          phaseState.phase === "fade" ? "reaction-overlay__linger--fade" : ""
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{
                          left: `${geometry.end.x}px`,
                          opacity: lingerOpacity,
                          top: `${geometry.end.y - 38}px`
                        }}
                      >
                        {reaction.emoji}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="action-row action-row--table action-row--table-split">
            <div className="action-row__cell action-row__cell--left">
              <button
                className="button button--quiet"
                disabled={busy || !viewModel.canReset}
                type="button"
                onClick={onReset}
                aria-label="Clear votes"
              >
                Clear votes
              </button>
            </div>
            <div className="action-row__cell action-row__cell--center">
              <button
                className="button button--primary"
                disabled={busy || !viewModel.canReveal}
                type="button"
                onClick={onReveal}
              >
                Reveal votes
              </button>
              <button
                className="button button--secondary"
                disabled={busy || !viewModel.canFinalize}
                type="button"
                onClick={onFinalize}
              >
                Finalize
              </button>
            </div>
            <div className="action-row__cell action-row__cell--right" aria-hidden="true" />
          </div>
        </section>

        <HistoryPanel history={history} roomId={viewModel.roomId} />
      </main>

      <footer className="vote-dock" aria-label="Vote cards">
        <div className="vote-dock__inner">
          <div className="vote-dock__summary">
            <span className="section-label">Vote</span>
            <strong>{selectedVote ? formatVoteLabel(selectedVote) : "Pick a card"}</strong>
            {selectedVote ? (
              <button
                className="button button--quiet vote-dock__clear"
                disabled={busy || !viewModel.canVote}
                type="button"
                onClick={onClearVote}
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="vote-grid">
            {DECK.map((vote) => (
              <VoteCard
                key={vote}
                disabled={busy || !viewModel.canVote}
                selected={selectedVote === vote}
                value={vote}
                onSelect={() => onVote(vote)}
              />
            ))}
            <div className={["custom-vote-card", isCustomSelected ? "is-selected" : ""].filter(Boolean).join(" ")}>
              <label className="custom-vote-card__field">
                <span>Custom</span>
                <input
                  disabled={busy || !viewModel.canVote}
                  inputMode="numeric"
                  maxLength={MAX_CUSTOM_VOTE_DIGITS}
                  pattern="[0-9]*"
                  placeholder="No."
                  value={customVoteDraft}
                  onChange={(event) => setCustomVoteDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      submitCustomVote();
                    }
                  }}
                />
              </label>
              <button
                disabled={busy || !viewModel.canVote || !customVote}
                type="button"
                onClick={submitCustomVote}
              >
                Vote
              </button>
            </div>
          </div>
        </div>
      </footer>
      <QrCodeModal url={roomLink} open={qrModalOpen} onClose={() => setQrModalOpen(false)} />
    </div>
  );
}
