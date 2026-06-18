export interface HostRoundControlsProps {
  busy: boolean;
  canReset: boolean;
  canReveal: boolean;
  canFinalize: boolean;
  onReset: () => void;
  onReveal: () => void;
  onFinalize: () => void;
}

export function HostRoundControls({
  busy,
  canReset,
  canReveal,
  canFinalize,
  onReset,
  onReveal,
  onFinalize,
}: HostRoundControlsProps) {
  return (
    <div className="action-row action-row--table action-row--table-split">
      <div className="action-row__cell action-row__cell--left">
        <button
          className="button button--quiet"
          disabled={busy || !canReset}
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
          disabled={busy || !canReveal}
          type="button"
          onClick={onReveal}
        >
          Reveal votes
        </button>
        <button
          className="button button--secondary"
          disabled={busy || !canFinalize}
          type="button"
          onClick={onFinalize}
        >
          Finalize
        </button>
      </div>
      <div className="action-row__cell action-row__cell--right" aria-hidden="true" />
    </div>
  );
}
