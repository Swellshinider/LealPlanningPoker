import { AUTHOR_NAME, COPYRIGHT_LABEL } from "../lib/publicPages";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__meta">
        <strong>{AUTHOR_NAME}</strong>
        <span>{COPYRIGHT_LABEL}</span>
      </div>
    </footer>
  );
}
