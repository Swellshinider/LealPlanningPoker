import type { RoomHistoryEntry } from "@lealplanningpoker/shared";
import { buildHistoryFilename, downloadTextFile, historyToCsv } from "../lib/historyExport";
import { formatVoteLabel } from "../lib/uiText";

export interface HistoryPanelProps {
  history: RoomHistoryEntry[];
  roomId: string;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function HistoryPanel({ history, roomId }: HistoryPanelProps) {
  const orderedHistory = [...history].reverse();

  function handleExportCsv() {
    downloadTextFile(
      buildHistoryFilename(roomId, "csv"),
      historyToCsv(history),
      "text/csv;charset=utf-8"
    );
  }

  return (
    <section className="workspace-panel history-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Archive</p>
          <h2>Recent stories</h2>
        </div>
        <span className="phase-chip phase-chip--quiet">{history.length} finalizations</span>
        {history.length > 0 ? (
          <div className="history-panel__export">
            <button
              className="button button--quiet button--compact"
              type="button"
              onClick={handleExportCsv}
            >
              Export CSV
            </button>
          </div>
        ) : null}
      </div>

      {orderedHistory.length === 0 ? (
        <div className="empty-state">
          <p>No finalized stories yet.</p>
        </div>
      ) : (
        <div className="history-list">
          {orderedHistory.map((entry) => (
            <article className="history-row" key={entry.id}>
              <div className="history-card__header">
                <strong>{entry.story}</strong>
                <time dateTime={entry.finalizedAt}>{formatTimestamp(entry.finalizedAt)}</time>
              </div>

              <div className="history-card__summary">
                {entry.voteSummary.length === 0 ? (
                  <span className="phase-chip phase-chip--quiet">No votes recorded</span>
                ) : (
                  entry.voteSummary.map((item) => (
                    <span className="phase-chip" key={`${entry.id}-${item.card}`}>
                      {formatVoteLabel(item.card)} x {item.count}
                    </span>
                  ))
                )}
              </div>

              <ul className="history-card__votes">
                {entry.votes.map((vote) => (
                  <li key={`${entry.id}-${vote.participantId}`}>
                    <span>{vote.name}</span>
                    <strong>{vote.vote ? formatVoteLabel(vote.vote) : "-"}</strong>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
