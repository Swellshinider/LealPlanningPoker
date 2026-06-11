import { useMemo, useState } from "react";
import {
  FIBONACCI_DECK,
  isBuiltInVoteCard,
  normalizeVoteCard,
  type RoomHistoryEntry,
  type VoteCard as VoteValue
} from "@lealplanningpoker/shared";
import type { RoomViewModel } from "../lib/roomView";
import { formatVoteLabel } from "../lib/uiText";
import { HistoryPanel } from "./HistoryPanel";
import { VoteCard } from "./VoteCard";

export interface RoomBoardProps {
  viewModel: RoomViewModel;
  history: RoomHistoryEntry[];
  displayName: string;
  storyDraft: string;
  selectedVote: VoteValue | null;
  notice: string | null;
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

export function RoomBoard({
  viewModel,
  history,
  displayName,
  storyDraft,
  selectedVote,
  notice,
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

      {notice ? <p className="notice notice--inline">{notice}</p> : null}

      <section className="room-hero">
        <div className="room-hero__copy">
          <h1>{viewModel.story || `Room ${viewModel.roomId}`}</h1>
        </div>
      </section>

      <main className="workspace-main">
        <div className="workspace-controls">
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
          </div>

          <div className="poker-table" aria-label="Planning poker table">
            <div className="poker-table__felt">
              <span>LEAL</span>
            </div>

            <div className="seat-grid">
              {viewModel.participants.map((participant) => {
                const hasFaceDownCard = participant.hasVoted && !participant.tableVote;
                const hasFaceUpCard = Boolean(participant.tableVote);

                return (
                  <article
                    className={[
                      "table-seat",
                      hasFaceUpCard ? "has-face-up-card" : "",
                      hasFaceDownCard ? "has-face-down-card" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={participant.id}
                  >
                    <strong>{participant.name}</strong>
                    <div className="table-card-slot" aria-label={`${participant.name} card`}>
                      {hasFaceUpCard && participant.tableVote ? (
                        <span className="table-card table-card--front">
                          {formatVoteLabel(participant.tableVote)}
                        </span>
                      ) : hasFaceDownCard ? (
                        <span className="table-card table-card--back" aria-hidden="true" />
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

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
