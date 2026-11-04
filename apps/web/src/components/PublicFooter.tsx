import { AUTHOR_NAME, COPYRIGHT_LABEL, KOFI_URL, LIVEPIX_URL } from "../lib/publicPages";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__meta">
        <strong>{AUTHOR_NAME}</strong>
        <span>{COPYRIGHT_LABEL}</span>
      </div>
      <div className="public-footer__support">
        <span>Support the project:</span>
        <a href={KOFI_URL} target="_blank" rel="noopener noreferrer">
          Ko-fi
        </a>
        <a href={LIVEPIX_URL} target="_blank" rel="noopener noreferrer">
          Pix (Livepix)
        </a>
      </div>
    </footer>
  );
}
