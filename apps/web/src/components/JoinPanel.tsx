import { HELP_PATH } from "../lib/publicPages";
import type { ThemeMode } from "../lib/theme";
import { AppLogo } from "./AppLogo";
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
          <AppLogo />
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

      <div className="public-page__main">
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

              <button
                className="button button--secondary button--full"
                disabled={busy}
                type="submit"
              >
                Join room
              </button>
            </form>
          </section>
        </div>
      </div>

      <PublicFooter />
    </section>
  );
}
