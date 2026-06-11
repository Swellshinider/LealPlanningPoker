export interface JoinPanelProps {
  displayName: string;
  roomCode: string;
  busy?: boolean;
  connectionState: string;
  notice: string | null;
  onDisplayNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export function JoinPanel({
  displayName,
  roomCode,
  busy = false,
  connectionState,
  notice,
  onDisplayNameChange,
  onRoomCodeChange,
  onCreateRoom,
  onJoinRoom
}: JoinPanelProps) {
  return (
    <section className="landing-workspace">
      <header className="workspace-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">LP</span>
          <div>
            <strong>LealPlanningPoker</strong>
            <span>Anonymous estimation rooms</span>
          </div>
        </div>

        <div className={`status-pill status-pill--${connectionState}`}>
          <span className="status-pill__dot" />
          <span>{connectionState}</span>
        </div>
      </header>

      <div className="landing-grid">
        <section className="landing-intro">
          <p className="section-label">Planning poker</p>
          <h1>Run estimation sessions from one clean workspace.</h1>
          <p>
            Create a room, share the code, vote privately, reveal together, and archive the result
            without accounts or setup overhead.
          </p>
          {notice ? <p className="notice">{notice}</p> : null}
        </section>

        <section className="workspace-panel join-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Start</p>
              <h2>Create a room</h2>
            </div>
          </div>

          <label className="field">
            <span className="field__label">Display name</span>
            <input
              className="field__input"
              maxLength={32}
              placeholder="Alex Morgan"
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
            />
          </label>

          <button className="button button--primary button--full" disabled={busy} type="button" onClick={onCreateRoom}>
            Create room
          </button>
        </section>

        <section className="workspace-panel join-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Join</p>
              <h2>Enter a room code</h2>
            </div>
          </div>

          <label className="field">
            <span className="field__label">Room code</span>
            <input
              className="field__input field__input--code"
              placeholder="ROOM42"
              value={roomCode}
              onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
            />
          </label>

          <button className="button button--secondary button--full" disabled={busy} type="button" onClick={onJoinRoom}>
            Join room
          </button>
        </section>
      </div>
    </section>
  );
}
