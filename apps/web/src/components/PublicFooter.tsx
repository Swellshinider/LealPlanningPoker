import { AUTHOR_NAME, COPYRIGHT_LABEL, REPO_URL } from "../lib/publicPages";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__meta">
        <strong>{AUTHOR_NAME}</strong>
        <span>{COPYRIGHT_LABEL}</span>
      </div>
      <a className="public-footer__link" href={REPO_URL} target="_blank" rel="noreferrer">
        {REPO_URL.replace("https://", "")}
      </a>
    </footer>
  );
}
