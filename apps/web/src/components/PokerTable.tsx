import type { ThrowableReactionEmoji } from "@lealplanningpoker/shared";
import type { RoomParticipantView, RoomViewModel } from "../lib/roomView";
import { getSeatGeometry } from "../lib/seatGeometry";
import { useSeatInteraction } from "../hooks/useSeatInteraction";
import { HostRoundControls } from "./HostRoundControls";
import { PlayerSeat } from "./PlayerSeat";
import { ReactionOverlay } from "./ReactionOverlay";

const MAX_TABLE_SEATS = 12;

export interface PokerTableProps {
  viewModel: RoomViewModel;
  busy: boolean;
  onThrowReaction: (targetParticipantId: string, emoji: ThrowableReactionEmoji) => void;
  onTransferHost: (targetParticipantId: string) => void;
  onReset: () => void;
  onReveal: () => void;
  onFinalize: () => void;
}

function formatAverage(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatConfidence(value: number | null): string {
  return value === null ? "-" : `${value}%`;
}

export function PokerTable({
  viewModel,
  busy,
  onThrowReaction,
  onTransferHost,
  onReset,
  onReveal,
  onFinalize,
}: PokerTableProps) {
  const seat = useSeatInteraction({
    participants: viewModel.participants,
    activeReactions: viewModel.activeReactions,
    isHost: viewModel.isHost,
  });
  const tableParticipants = viewModel.participants.slice(0, MAX_TABLE_SEATS);
  const overflowParticipants = viewModel.participants.slice(MAX_TABLE_SEATS);
  const selfParticipantId = viewModel.participants.find((participant) => participant.isSelf)?.id;

  function getHostActionFor(participant: RoomParticipantView): {
    label: "Transfer host" | "Claim host";
    visibility: "hover" | "always";
  } | null {
    if (viewModel.isHost && participant.connected && !participant.isSelf) {
      return {
        label: "Transfer host",
        visibility: "hover",
      };
    }

    if (viewModel.canClaimHost && participant.isHost && !participant.connected) {
      return {
        label: "Claim host",
        visibility: "always",
      };
    }

    return null;
  }

  return (
    <section className="workspace-panel poker-table-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Vote table</p>
          <h2>{viewModel.participants.length} players</h2>
        </div>
        <span className="phase-chip phase-chip--quiet">{tableParticipants.length} at table</span>
      </div>

      <div ref={seat.stageRef} className="reaction-stage">
        <div className="poker-table" aria-label="Planning poker table">
          <div className="poker-table__surface">
            <div className="poker-table__felt">
              <span className="poker-table__brand">LEAL</span>
              {viewModel.resultStats ? (
                <div
                  className="table-results table-results--felt"
                  aria-label="Round result"
                  aria-live="polite"
                >
                  <div className="table-result">
                    <span>Average</span>
                    <strong>{formatAverage(viewModel.resultStats.average)}</strong>
                  </div>
                  <div className="table-result">
                    <span>Confidence</span>
                    <strong>{formatConfidence(viewModel.resultStats.confidence)}</strong>
                  </div>
                </div>
              ) : null}
              <small>Planning Poker</small>
            </div>
          </div>

          <div className="seat-ring">
            {tableParticipants.map((participant, index) => {
              const hostAction = getHostActionFor(participant);

              return (
                <PlayerSeat
                  key={participant.id}
                  busy={busy}
                  geometry={getSeatGeometry(index, tableParticipants.length)}
                  hostActionLabel={hostAction?.label}
                  hostActionVisibility={hostAction?.visibility}
                  isHostActionOpen={seat.activeHostActionParticipantId === participant.id}
                  isHeadBumped={seat.bumpedTargets.has(participant.id)}
                  isReactionPopoverOpen={seat.activeReactionTargetId === participant.id}
                  isReactionTarget={participant.connected && !participant.isSelf}
                  participant={participant}
                  onCloseHostAction={() => seat.scheduleHostActionClose(participant.id)}
                  registerHeadElement={seat.registerHeadElement}
                  registerSeatElement={seat.registerSeatElement}
                  variant="ring"
                  onOpenHostAction={() => seat.openHostActionFor(participant.id)}
                  onCloseReactionPopover={() => seat.scheduleReactionPopoverClose(participant.id)}
                  onHostAction={() =>
                    onTransferHost(
                      hostAction?.label === "Claim host"
                        ? (selfParticipantId ?? participant.id)
                        : participant.id,
                    )
                  }
                  onOpenReactionPopover={() => seat.openReactionPopoverFor(participant.id)}
                  onThrowReaction={(emoji) => {
                    seat.dismissReactionPopover();
                    onThrowReaction(participant.id, emoji);
                  }}
                  onToggleReactionPopover={() => seat.toggleReactionPopover(participant.id)}
                />
              );
            })}
          </div>
        </div>

        {overflowParticipants.length > 0 ? (
          <div className="overflow-bench" aria-label="Overflow players">
            <div className="overflow-bench__header">
              <span className="section-label">Bench</span>
              <strong>{overflowParticipants.length} overflow players</strong>
            </div>
            <div className="overflow-bench__list">
              {overflowParticipants.map((participant) => {
                const hostAction = getHostActionFor(participant);

                return (
                  <PlayerSeat
                    key={participant.id}
                    busy={busy}
                    hostActionLabel={hostAction?.label}
                    hostActionVisibility={hostAction?.visibility}
                    isHostActionOpen={seat.activeHostActionParticipantId === participant.id}
                    isHeadBumped={seat.bumpedTargets.has(participant.id)}
                    isReactionPopoverOpen={seat.activeReactionTargetId === participant.id}
                    isReactionTarget={participant.connected && !participant.isSelf}
                    participant={participant}
                    onCloseHostAction={() => seat.scheduleHostActionClose(participant.id)}
                    registerHeadElement={seat.registerHeadElement}
                    registerSeatElement={seat.registerSeatElement}
                    variant="bench"
                    onOpenHostAction={() => seat.openHostActionFor(participant.id)}
                    onCloseReactionPopover={() => seat.scheduleReactionPopoverClose(participant.id)}
                    onHostAction={() =>
                      onTransferHost(
                        hostAction?.label === "Claim host"
                          ? (selfParticipantId ?? participant.id)
                          : participant.id,
                      )
                    }
                    onOpenReactionPopover={() => seat.openReactionPopoverFor(participant.id)}
                    onThrowReaction={(emoji) => {
                      seat.dismissReactionPopover();
                      onThrowReaction(participant.id, emoji);
                    }}
                    onToggleReactionPopover={() => seat.toggleReactionPopover(participant.id)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        <ReactionOverlay renderedReactions={seat.renderedReactions} />
      </div>

      {viewModel.isHost ? (
        <HostRoundControls
          busy={busy}
          canReset={viewModel.canReset}
          canReveal={viewModel.canReveal}
          canFinalize={viewModel.canFinalize}
          onReset={onReset}
          onReveal={onReveal}
          onFinalize={onFinalize}
        />
      ) : null}
    </section>
  );
}
