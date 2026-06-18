import type { RenderedReaction } from "../hooks/useSeatInteraction";

export interface ReactionOverlayProps {
  renderedReactions: RenderedReaction[];
}

export function ReactionOverlay({ renderedReactions }: ReactionOverlayProps) {
  return (
    <div className="reaction-stage__overlay" aria-hidden="true">
      {renderedReactions.map(({ geometry, phaseState, point, reaction }) => {
        const lingerOpacity = phaseState.phase === "fade" ? 1 - phaseState.progress : 1;

        return (
          <div key={reaction.id} className="reaction-overlay">
            {phaseState.phase === "flight" ? (
              <span
                className="reaction-overlay__emoji reaction-overlay__emoji--flight"
                style={{
                  left: `${point.x}px`,
                  top: `${point.y}px`,
                }}
              >
                {reaction.emoji}
              </span>
            ) : null}

            {phaseState.phase === "impact" ? (
              <>
                <span
                  className="reaction-overlay__emoji reaction-overlay__emoji--impact"
                  style={{
                    left: `${geometry.end.x}px`,
                    top: `${geometry.end.y}px`,
                  }}
                >
                  {reaction.emoji}
                </span>
                <span
                  className="reaction-overlay__burst"
                  style={{
                    left: `${geometry.end.x}px`,
                    top: `${geometry.end.y}px`,
                  }}
                />
              </>
            ) : null}

            {phaseState.phase === "linger" || phaseState.phase === "fade" ? (
              <span
                className={[
                  "reaction-overlay__linger",
                  phaseState.phase === "fade" ? "reaction-overlay__linger--fade" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: `${geometry.end.x}px`,
                  opacity: lingerOpacity,
                  top: `${geometry.end.y - 38}px`,
                }}
              >
                {reaction.emoji}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
