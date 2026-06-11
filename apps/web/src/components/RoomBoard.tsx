import type { RoomHistoryEntry, VoteCard as VoteValue } from "@lealplanningpoker/shared";
import type { RoomViewModel } from "../lib/roomView";
import { getParticipantVoteLabel } from "../lib/uiText";
import { HistoryPanel } from "./HistoryPanel";
import { VoteCard } from "./VoteCard";

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
  const voteProgress =
    viewModel.totalParticipants > 0
      ? Math.round((viewModel.votedCount / viewModel.totalParticipants) * 100)
      : 0;

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
          <div className={`status-pill status-pill--${connectionState}`}>
            <span className="status-pill__dot" />
            <span>{connectionState}</span>
          </div>
          <button className="button button--quiet" type="button" onClick={onCopyLink}>
            Copy link
          </button>
        </div>
      </header>

      {notice ? <p className="notice notice--inline">{notice}</p> : null}

      <section className="room-hero workspace-panel">
        <div className="room-hero__copy">
          <p className="section-label">Room {viewModel.roomId}</p>
          <h1>{viewModel.story || "Waiting for the story"}</h1>
          <p>{viewModel.phaseCopy}</p>
        </div>

        <div className="metrics-strip">
          <div className="metric">
            <span>Connected</span>
            <strong>
              {viewModel.connectedCount}/{viewModel.totalParticipants}
            </strong>
          </div>
          <div className="metric">
            <span>Voted</span>
            <strong>
              {viewModel.votedCount}/{viewModel.totalParticipants}
            </strong>
          </div>
          <div className="metric">
            <span>Phase</span>
            <strong>{viewModel.phaseLabel}</strong>
          </div>
        </div>

        <div className="progress-track" aria-label={`${voteProgress}% of participants have voted`}>
          <span style={{ width: `${voteProgress}%` }} />
        </div>
      </section>

      <div className="workspace-grid">
        <main className="workspace-main">
          <section className="workspace-panel story-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Story</p>
                <h2>{viewModel.canSetStory ? "Set the next round" : "Story locked"}</h2>
              </div>
              <span className="phase-chip">{viewModel.phaseLabel}</span>
            </div>

            <label className="field">
              <span className="field__label">Story / ticket</span>
              <textarea
                className="field__textarea"
                disabled={!viewModel.canSetStory}
                placeholder="Improve onboarding flow"
                rows={3}
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
                {viewModel.phaseLabel === "Finalized" ? "Start next round" : "Start voting"}
              </button>
            </div>
          </section>

          <section className="workspace-panel vote-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Vote cards</p>
                <h2>Pick privately</h2>
              </div>
              <span className="phase-chip phase-chip--quiet">{selectedVote ?? "None"}</span>
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

            <div className="action-row action-row--split">
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

        <aside className="workspace-side">
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

          <section className="workspace-panel room-link-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Invite</p>
                <h2>Share room</h2>
              </div>
            </div>
            <input className="field__input" readOnly value={roomLink} />
          </section>

          <section className="workspace-panel participants-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Participants</p>
                <h2>{viewModel.participants.length} people</h2>
              </div>
            </div>

            <div className="participant-list">
              {viewModel.participants.map((participant) => (
                <article className="participant-row" key={participant.id}>
                  <div>
                    <strong>{participant.name}</strong>
                    <span>
                      {participant.isHost ? "Host" : "Member"} · {participant.connected ? "Connected" : "Away"}
                    </span>
                  </div>
                  <span className={participant.visibleVote ? "vote-bubble" : "vote-bubble vote-bubble--quiet"}>
                    {getParticipantVoteLabel({
                      hasVoted: participant.hasVoted,
                      visibleVote: participant.visibleVote
                    })}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
