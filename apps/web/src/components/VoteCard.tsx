import type { VoteCard as VoteValue } from "@lealplanningpoker/shared";

export interface VoteCardProps {
  value: VoteValue;
  selected?: boolean;
  disabled?: boolean;
  revealed?: boolean;
  onSelect?: () => void;
}

export function VoteCard({
  value,
  selected = false,
  disabled = false,
  revealed = false,
  onSelect
}: VoteCardProps) {
  const label = value === "coffee" ? "coffee" : value;

  return (
    <button
      className={[
        "vote-card",
        selected ? "is-selected" : "",
        revealed ? "is-revealed" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="vote-card__front">{label}</span>
      <span className="vote-card__back">reveal</span>
    </button>
  );
}
