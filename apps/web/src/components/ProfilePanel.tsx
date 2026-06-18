export interface ProfilePanelProps {
  displayName: string;
  busy: boolean;
  onDisplayNameChange: (value: string) => void;
  onRename: () => void;
}

export function ProfilePanel({
  displayName,
  busy,
  onDisplayNameChange,
  onRename,
}: ProfilePanelProps) {
  return (
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
  );
}
