import { useMemo, useState } from "react";
import { MAX_CUSTOM_VOTE_DIGITS } from "@lealplanningpoker/shared";
import type { VoteCard as VoteValue } from "@lealplanningpoker/shared";
import { formatVoteLabel } from "../lib/uiText";
import { DECK, isCustomVoteSelected, resolveCustomVote } from "../lib/voteDeck";
import { VoteCard } from "./VoteCard";

export interface VoteDockProps {
  selectedVote: VoteValue | null;
  busy: boolean;
  canVote: boolean;
  onVote: (vote: VoteValue) => void;
  onClearVote: () => void;
}

export function VoteDock({ selectedVote, busy, canVote, onVote, onClearVote }: VoteDockProps) {
  const [customVoteDraft, setCustomVoteDraft] = useState("");
  const customVote = useMemo(() => resolveCustomVote(customVoteDraft), [customVoteDraft]);
  const isCustomSelected = isCustomVoteSelected(selectedVote);

  function submitCustomVote() {
    if (!customVote) {
      return;
    }

    onVote(customVote);
  }

  return (
    <footer className="vote-dock" aria-label="Vote cards">
      <div className="vote-dock__inner">
        <div className="vote-dock__summary">
          <span className="section-label">Vote</span>
          <strong>{selectedVote ? formatVoteLabel(selectedVote) : "Pick a card"}</strong>
          {selectedVote ? (
            <button
              className="button button--quiet vote-dock__clear"
              disabled={busy || !canVote}
              type="button"
              onClick={onClearVote}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="vote-grid">
          {DECK.map((vote) => (
            <VoteCard
              key={vote}
              disabled={busy || !canVote}
              selected={selectedVote === vote}
              value={vote}
              onSelect={() => onVote(vote)}
            />
          ))}
          <div
            className={["custom-vote-card", isCustomSelected ? "is-selected" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <label className="custom-vote-card__field">
              <span>Custom</span>
              <input
                disabled={busy || !canVote}
                inputMode="numeric"
                maxLength={MAX_CUSTOM_VOTE_DIGITS}
                pattern="[0-9]*"
                placeholder="No."
                value={customVoteDraft}
                onChange={(event) => setCustomVoteDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitCustomVote();
                  }
                }}
              />
            </label>
            <button
              disabled={busy || !canVote || !customVote}
              type="button"
              onClick={submitCustomVote}
            >
              Vote
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
