import { THROWABLE_REACTION_EMOJIS } from "@lealplanningpoker/shared";
import type { ThrowableReactionEmoji } from "@lealplanningpoker/shared";
import type { RoomParticipantView } from "../lib/roomView";
import { getPlayerInitials, getPlayerStatus } from "../lib/seatGeometry";
import type { SeatGeometry } from "../lib/seatGeometry";
import { formatVoteLabel } from "../lib/uiText";

interface PlayerSeatProps {
  participant: RoomParticipantView;
  variant: "ring" | "bench";
  geometry?: SeatGeometry;
  busy: boolean;
  hostActionLabel?: "Transfer host" | "Claim host";
  hostActionVisibility?: "hover" | "always";
  isHostActionOpen: boolean;
  isReactionTarget: boolean;
  isReactionPopoverOpen: boolean;
  isHeadBumped: boolean;
  onCloseHostAction: () => void;
  onCloseReactionPopover: () => void;
  onHostAction?: () => void;
  onOpenHostAction: () => void;
  onOpenReactionPopover: () => void;
  onThrowReaction: (emoji: ThrowableReactionEmoji) => void;
  onToggleReactionPopover: () => void;
  registerHeadElement: (participantId: string, element: HTMLElement | null) => void;
  registerSeatElement: (participantId: string, element: HTMLElement | null) => void;
}

export function PlayerSeat({
  participant,
  variant,
  geometry,
  busy,
  hostActionLabel,
  hostActionVisibility = "hover",
  isHostActionOpen,
  isReactionTarget,
  isReactionPopoverOpen,
  isHeadBumped,
  onCloseHostAction,
  onCloseReactionPopover,
  onHostAction,
  onOpenHostAction,
  onOpenReactionPopover,
  onThrowReaction,
  onToggleReactionPopover,
  registerHeadElement,
  registerSeatElement,
}: PlayerSeatProps) {
  const hasFaceDownCard = participant.hasVoted && !participant.tableVote;
  const hasFaceUpCard = Boolean(participant.tableVote);
  const initials = getPlayerInitials(participant.name);
  const headClassName = ["player-seat__head", isHeadBumped ? "player-seat__head--bumped" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      ref={(element) => registerSeatElement(participant.id, element)}
      className={[
        "table-seat",
        variant === "ring" ? "table-seat--ring" : "table-seat--bench",
        geometry?.zoneClass ?? "",
        participant.isHost ? "table-seat--host" : "",
        participant.connected ? "" : "table-seat--offline",
        hasFaceUpCard ? "has-face-up-card" : "",
        hasFaceDownCard ? "has-face-down-card" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={geometry?.style}
      data-host-action-region={hostActionLabel === "Transfer host" ? "true" : undefined}
      aria-label={`${participant.name} seat`}
      onMouseEnter={hostActionLabel === "Transfer host" ? onOpenHostAction : undefined}
      onMouseLeave={hostActionLabel === "Transfer host" ? onCloseHostAction : undefined}
    >
      <div className="player-seat__person" aria-hidden="true">
        <span className="player-seat__shadow" />
        <span className="player-seat__body" />
        {isReactionTarget ? (
          <div
            className="player-seat__reaction-region"
            data-reaction-region="true"
            onMouseEnter={onOpenReactionPopover}
            onMouseLeave={onCloseReactionPopover}
          >
            <button
              aria-expanded={isReactionPopoverOpen}
              aria-label={`Throw a reaction at ${participant.name}`}
              className="player-seat__head-button"
              data-reaction-trigger="true"
              type="button"
              onPointerDown={(event) => {
                if (event.pointerType !== "mouse") {
                  event.preventDefault();
                  onToggleReactionPopover();
                }
              }}
            >
              <span
                ref={(element) => registerHeadElement(participant.id, element)}
                className={headClassName}
              >
                <span>{initials}</span>
              </span>
            </button>

            <div
              className="reaction-popover"
              hidden={!isReactionPopoverOpen}
              role="menu"
              aria-label={`Reaction choices for ${participant.name}`}
              onMouseEnter={onOpenReactionPopover}
              onMouseLeave={onCloseReactionPopover}
            >
              {THROWABLE_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  aria-label={`Throw ${emoji} at ${participant.name}`}
                  className="reaction-popover__emoji"
                  type="button"
                  onClick={() => onThrowReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span
            ref={(element) => registerHeadElement(participant.id, element)}
            className={headClassName}
          >
            <span>{initials}</span>
          </span>
        )}
      </div>

      <div className="player-seat__plate">
        <strong>{participant.name}</strong>
        <span>{getPlayerStatus(participant)}</span>
      </div>

      <div className="table-card-slot" aria-label={`${participant.name} card`}>
        {hasFaceUpCard && participant.tableVote ? (
          <span className="table-card table-card--front">
            {formatVoteLabel(participant.tableVote)}
          </span>
        ) : hasFaceDownCard ? (
          <span className="table-card table-card--back" aria-hidden="true" />
        ) : (
          <span className="table-card-placeholder" aria-hidden="true" />
        )}
      </div>

      {hostActionLabel && onHostAction ? (
        <button
          className={[
            "button",
            "button--quiet",
            "button--compact",
            "player-seat__host-action",
            isHostActionOpen ? "player-seat__host-action--open" : "",
            isReactionPopoverOpen && hostActionLabel === "Transfer host"
              ? "player-seat__host-action--suppressed"
              : "",
            hostActionVisibility === "always"
              ? "player-seat__host-action--visible"
              : "player-seat__host-action--hover",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={busy}
          type="button"
          onMouseEnter={hostActionLabel === "Transfer host" ? onOpenHostAction : undefined}
          onMouseLeave={hostActionLabel === "Transfer host" ? onCloseHostAction : undefined}
          onClick={onHostAction}
        >
          {hostActionLabel}
        </button>
      ) : null}
    </article>
  );
}
