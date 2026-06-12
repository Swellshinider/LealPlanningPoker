import { useMemo, useState, type CSSProperties } from "react";
import {
  FIBONACCI_DECK,
  MAX_CUSTOM_VOTE_DIGITS,
  isBuiltInVoteCard,
  normalizeVoteCard,
  type RoomHistoryEntry,
  type VoteCard as VoteValue
} from "@lealplanningpoker/shared";
import type { RoomParticipantView, RoomViewModel } from "../lib/roomView";
import { formatVoteLabel } from "../lib/uiText";
import { HistoryPanel } from "./HistoryPanel";
import { VoteCard } from "./VoteCard";

export interface RoomBoardProps {
  viewModel: RoomViewModel;
  history: RoomHistoryEntry[];
  displayName: string;
  storyDraft: string;
  selectedVote: VoteValue | null;
  busy?: boolean;
  onDisplayNameChange: (value: string) => void;
  onRename: () => void;
  onStoryChange: (value: string) => void;
  onSaveStory: () => void;
  onVote: (vote: VoteValue) => void;
  onReveal: () => void;
  onReset: () => void;
  onFinalize: () => void;
  onCopyLink: () => void;
  onNewRoom: () => void;
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
  const initials = words.length > 1
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

function PlayerSeat({ participant, variant, geometry }: PlayerSeatProps) {
  const hasFaceDownCard = participant.hasVoted && !participant.tableVote;
  const hasFaceUpCard = Boolean(participant.tableVote);

  return (
    <article
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
        <span className="player-seat__head">
          <span>{getPlayerInitials(participant.name)}</span>
        </span>
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
  busy = false,
  onDisplayNameChange,
  onRename,
  onStoryChange,
  onSaveStory,
  onVote,
  onReveal,
  onReset,
  onFinalize,
  onCopyLink,
  onNewRoom
}: RoomBoardProps) {
  const [customVoteDraft, setCustomVoteDraft] = useState("");
  const normalizedCustomVote = useMemo(() => normalizeVoteCard(customVoteDraft), [customVoteDraft]);
  const customVote = normalizedCustomVote && /^\d+$/.test(normalizedCustomVote) ? normalizedCustomVote : null;
  const isCustomSelected = Boolean(selectedVote && !isBuiltInVoteCard(selectedVote));
  const tableParticipants = viewModel.participants.slice(0, MAX_TABLE_SEATS);
  const overflowParticipants = viewModel.participants.slice(MAX_TABLE_SEATS);

  function submitCustomVote() {
    if (!customVote) {
      return;
    }

    onVote(customVote);
  }

  return (
    <div className="room-workspace">
      <header className="workspace-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">LP</span>
          <div>
            <strong>LealPlanningPoker</strong>
            <span>Room {viewModel.roomId}</span>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="button button--quiet" type="button" onClick={onCopyLink}>
            Copy link
          </button>
          <button className="button button--quiet" type="button" onClick={onNewRoom}>
            New room
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
            <span className="phase-chip phase-chip--quiet">
              {tableParticipants.length} at table
            </span>
          </div>

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
                  participant={participant}
                  variant="ring"
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
                  <PlayerSeat key={participant.id} participant={participant} variant="bench" />
                ))}
              </div>
            </div>
          ) : null}

          <div className="action-row action-row--table">
            <button
              className="button button--primary"
              disabled={busy || !viewModel.canReveal}
              type="button"
              onClick={onReveal}
            >
              Reveal votes
            </button>
            <button
              className="button button--quiet"
              disabled={busy || !viewModel.canReset}
              type="button"
              onClick={onReset}
            >
              Reset
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
        </section>

        <HistoryPanel history={history} />
      </main>

      <footer className="vote-dock" aria-label="Vote cards">
        <div className="vote-dock__inner">
          <div className="vote-dock__summary">
            <span className="section-label">Vote</span>
            <strong>{selectedVote ? formatVoteLabel(selectedVote) : "Pick a card"}</strong>
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
    </div>
  );
}
