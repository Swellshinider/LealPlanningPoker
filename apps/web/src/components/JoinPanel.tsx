import { HELP_PATH } from "../lib/publicPages";
import type { ThemeMode } from "../lib/theme";
import { PublicFooter } from "./PublicFooter";
import { ThemeToggleButton } from "./ThemeToggleButton";

export interface JoinPanelProps {
  displayName: string;
  roomCode: string;
  theme: ThemeMode;
  busy?: boolean;
  autoFocusName?: boolean;
  onDisplayNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onToggleTheme: () => void;
}

export function JoinPanel({
  displayName,
  roomCode,
  theme,
  busy = false,
  autoFocusName = false,
  onDisplayNameChange,
  onRoomCodeChange,
  onCreateRoom,
  onJoinRoom,
  onToggleTheme,
}: JoinPanelProps) {
  return (
    <section className="landing-workspace public-page">
      <header className="workspace-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">LP</span>
          <div>
            <strong>LealPlanningPoker</strong>
            <span>Real-time estimation rooms</span>
          </div>
        </div>

        <div className="topbar-actions">
          <a className="button button--quiet button--link" href={HELP_PATH}>
            Help
          </a>
          <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
        </div>
      </header>

      <section className="public-hero">
        <div className="landing-intro public-hero__copy">
          <p className="section-label">Planning poker</p>
          <h1>Run focused estimation sessions without adding process overhead.</h1>
          <p>
            Create a room in seconds, invite the team with a code or link, reveal every estimate at
            once, and keep each finalized round visible while the session stays active.
          </p>
          <div className="public-highlights">
            <div className="workspace-panel public-highlight">
              <strong>No accounts</strong>
              <span>Open a room and start immediately.</span>
            </div>
            <div className="workspace-panel public-highlight">
              <strong>Private voting</strong>
              <span>Everyone commits before estimates are revealed.</span>
            </div>
            <div className="workspace-panel public-highlight">
              <strong>Built for teams</strong>
              <span>Copy links, show QR codes, and archive finished rounds.</span>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-grid">

        <section className="workspace-panel join-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Start</p>
              <h2>Create a room</h2>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) onCreateRoom();
            }}
          >
            <label className="field">
              <span className="field__label">Display name</span>
              <input
                className="field__input"
                maxLength={32}
                placeholder="Alex Morgan"
                required
                value={displayName}
                autoFocus={autoFocusName}
                onChange={(event) => onDisplayNameChange(event.target.value)}
              />
            </label>

            <button className="button button--primary button--full" disabled={busy} type="submit">
              Create room
            </button>
          </form>
        </section>

        <section className="workspace-panel join-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Join</p>
              <h2>Enter a room code</h2>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) onJoinRoom();
            }}
          >
            <label className="field">
              <span className="field__label">Room code</span>
              <input
                className="field__input field__input--code"
                maxLength={9}
                placeholder="ABCD-2345"
                required
                value={roomCode}
                onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
              />
            </label>

            <button className="button button--secondary button--full" disabled={busy} type="submit">
              Join room
            </button>
          </form>
        </section>
      </div>

      <section className="workspace-panel landing-support">
        <div className="panel-heading">
          <div>
            <p className="section-label">How it works</p>
            <h2>Three quick steps</h2>
          </div>
        </div>
        <div className="support-steps">
          <article className="support-step">
            <span className="support-step__index">1</span>
            <div>
              <h3>Create a room</h3>
              <p>Pick your display name and open a fresh session as the host.</p>
            </div>
          </article>
          <article className="support-step">
            <span className="support-step__index">2</span>
            <div>
              <h3>Share and vote</h3>
              <p>Invite the team with the room code or link, then let everyone vote privately.</p>
            </div>
          </article>
          <article className="support-step">
            <span className="support-step__index">3</span>
            <div>
              <h3>Reveal and finalize</h3>
              <p>Compare estimates together, finalize the round, and keep the result in the archive.</p>
            </div>
          </article>
        </div>
      </section>

      <PublicFooter />
    </section>
  );
}
