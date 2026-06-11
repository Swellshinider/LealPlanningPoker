import type { RoomHistoryEntry, VoteCard as VoteValue } from "@lealplanningpoker/shared";
import type { RoomViewModel } from "../lib/roomView";
import { VoteCard } from "./VoteCard";
import { HistoryPanel } from "./HistoryPanel";

export interface RoomBoardProps {
  viewModel: RoomViewModel;
  history: RoomHistoryEntry[];
  displayName: string;
  storyDraft: string;
  selectedVote: VoteValue | null;
  connectionState: string;
  notice: string | null;
  roomLink: string;
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
}

const DECK: VoteValue[] = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "coffee"];

export function RoomBoard({
  viewModel,
  history,
  displayName,
  storyDraft,
  selectedVote,
  connectionState,
  notice,
  roomLink,
  busy = false,
  onDisplayNameChange,
  onRename,
  onStoryChange,
  onSaveStory,
  onVote,
  onReveal,
  onReset,
  onFinalize,
  onCopyLink
}: RoomBoardProps) {
  const roomCanVote = viewModel.phaseLabel === "Voting";

  return (
    <div className="room-layout">
      <section className="panel room-shell">
        <div className="room-shell__top">
          <div>
            <p className="eyebrow">Room {viewModel.roomId}</p>
            <h1>{viewModel.story || "Waiting for the story"}</h1>
            <p className="hero-copy">{viewModel.phaseCopy}</p>
          </div>

          <div className={`status-pill status-pill--${connectionState}`}>
            <span className="status-pill__dot" />
            <span>{connectionState}</span>
          </div>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="room-metrics">
          <article className="metric-card">
            <span className="metric-card__label">Connected</span>
            <strong>
              {viewModel.connectedCount}/{viewModel.totalParticipants}
            </strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Voted</span>
            <strong>
              {viewModel.votedCount}/{viewModel.totalParticipants}
            </strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Phase</span>
            <strong>{viewModel.phaseLabel}</strong>
          </article>
        </div>

        <div className="room-link">
          <input className="field__input" readOnly value={roomLink} />
          <button className="button button--ghost" type="button" onClick={onCopyLink}>
            Copy link
          </button>
        </div>
      </section>

      <div className="room-grid">
        <section className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Your profile</p>
              <h2>Display name</h2>
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
            <button className="button button--primary" disabled={busy} type="button" onClick={onRename}>
              Save name
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Story</p>
              <h2>{viewModel.canSetStory ? "Set the next round" : "Story locked"}</h2>
            </div>
            <span className="chip">{viewModel.phaseLabel}</span>
          </div>

          <label className="field">
            <span className="field__label">Story / ticket</span>
            <textarea
              className="field__textarea"
              disabled={!viewModel.canSetStory}
              placeholder="Improve onboarding flow"
              rows={4}
              value={storyDraft}
              onChange={(event) => onStoryChange(event.target.value)}
            />
          </label>

          <div className="join-actions">
            <button
              className="button button--accent"
              disabled={busy || !viewModel.canSetStory}
              type="button"
              onClick={onSaveStory}
            >
              {viewModel.phaseLabel === "Finalized" ? "Start next round" : "Start voting"}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Vote cards</p>
              <h2>Pick privately</h2>
            </div>
            <span className="chip chip--quiet">{selectedVote ?? "none"}</span>
          </div>

          <div className="vote-grid">
            {DECK.map((vote) => (
              <VoteCard
                key={vote}
                disabled={busy || !roomCanVote}
                revealed={viewModel.isLiveReveal}
                selected={selectedVote === vote}
                value={vote}
                onSelect={() => onVote(vote)}
              />
            ))}
          </div>

          <div className="room-actions">
            <button
              className="button button--primary"
              disabled={busy || !viewModel.canReveal}
              type="button"
              onClick={onReveal}
            >
              Reveal votes
            </button>
            <button
              className="button button--ghost"
              disabled={busy || !viewModel.canReset}
              type="button"
              onClick={onReset}
            >
              Reset round
            </button>
            <button
              className="button button--accent"
              disabled={busy || !viewModel.canFinalize}
              type="button"
              onClick={onFinalize}
            >
              Finalize
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <div>
              <p className="eyebrow">Participants</p>
              <h2>{viewModel.participants.length} people in the room</h2>
            </div>
          </div>

          <div className="participant-grid">
            {viewModel.participants.map((participant, index) => (
              <article
                className="participant-card"
                key={participant.id}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="participant-card__top">
                  <strong>{participant.name}</strong>
                  <span className={`chip ${participant.connected ? "" : "chip--quiet"}`}>
                    {participant.isHost ? "host" : "member"}
                  </span>
                </div>

                <div className="participant-card__bottom">
                  <span className={`status-badge ${participant.connected ? "status-badge--live" : ""}`}>
                    {participant.connected ? "connected" : "away"}
                  </span>
                  <span className="vote-bubble">{participant.visibleVote ?? "hidden"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <HistoryPanel history={history} />
    </div>
  );
}
