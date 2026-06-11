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
    <section className="landing">
      <div className="landing__hero panel">
        <p className="eyebrow">Planning poker</p>
        <h1>Run quick, animated estimation sessions without accounts.</h1>
        <p className="hero-copy">
          Create a room, share the link, reveal together, and keep the flow moving without the
          overhead of sign-ins or saved profiles.
        </p>

        <div className={`status-pill status-pill--${connectionState}`}>
          <span className="status-pill__dot" />
          <span>{connectionState}</span>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}
      </div>

      <div className="panel join-card">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Your identity</p>
            <h2>Set a display name</h2>
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

        <div className="join-actions">
          <button className="button button--primary" disabled={busy} type="button" onClick={onCreateRoom}>
            Create room
          </button>
        </div>
      </div>

      <div className="panel join-card">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Join existing room</p>
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

        <div className="join-actions">
          <button className="button button--accent" disabled={busy} type="button" onClick={onJoinRoom}>
            Join room
          </button>
        </div>
      </div>
    </section>
  );
}
