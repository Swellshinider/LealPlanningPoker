export interface InviteCardProps {
  roomId: string;
  roomLink: string;
  onCopyLink: () => void;
}

export function InviteCard({ roomId, roomLink, onCopyLink }: InviteCardProps) {
  return (
    <section className="workspace-panel invite-card">
      <div className="panel-heading">
        <div>
          <p className="section-label">Invite</p>
          <h2>Invite your team</h2>
        </div>
      </div>

      <p className="invite-card__code">{roomId}</p>
      <p className="field__hint">
        Share this code or the link below. You can also use the QR button in the top bar.
      </p>
      <p className="invite-card__link">{roomLink}</p>

      <div className="action-row">
        <button className="button button--primary" type="button" onClick={onCopyLink}>
          Copy invite link
        </button>
      </div>
    </section>
  );
}
