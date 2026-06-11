import type { RoomHistoryEntry } from "@lealplanningpoker/shared";

export interface HistoryPanelProps {
  history: RoomHistoryEntry[];
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  const orderedHistory = [...history].reverse();

  return (
    <section className="panel panel--history">
      <div className="panel__heading">
        <div>
          <p className="eyebrow">Archive</p>
          <h2>Recent stories</h2>
        </div>
        <span className="chip chip--quiet">{history.length} finalizations</span>
      </div>

      {orderedHistory.length === 0 ? (
        <div className="empty-state">
          <p>No finalized stories yet.</p>
        </div>
      ) : (
        <div className="history-list">
          {orderedHistory.map((entry) => (
            <article className="history-card" key={entry.id}>
              <div className="history-card__header">
                <strong>{entry.story}</strong>
                <time dateTime={entry.finalizedAt}>{formatTimestamp(entry.finalizedAt)}</time>
              </div>

              <div className="history-card__summary">
                {entry.voteSummary.length === 0 ? (
                  <span className="chip chip--quiet">No votes recorded</span>
                ) : (
                  entry.voteSummary.map((item) => (
                    <span className="chip" key={`${entry.id}-${item.card}`}>
                      {item.card} x {item.count}
                    </span>
                  ))
                )}
              </div>

              <ul className="history-card__votes">
                {entry.votes.map((vote) => (
                  <li key={`${entry.id}-${vote.participantId}`}>
                    <span>{vote.name}</span>
                    <strong>{vote.vote ?? "—"}</strong>
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
