import {
  type RoomHistoryEntry,
  type ThrowableReactionEmoji,
  type VoteCard as VoteValue,
} from "@lealplanningpoker/shared";
import type { RoomViewModel } from "../lib/roomView";
import type { ThemeMode } from "../lib/theme";
import { HistoryPanel } from "./HistoryPanel";
import { PokerTable } from "./PokerTable";
import { ProfilePanel } from "./ProfilePanel";
import { PublicFooter } from "./PublicFooter";
import { RoomHero } from "./RoomHero";
import { RoomTopBar } from "./RoomTopBar";
import { StoryPanel } from "./StoryPanel";
import { VoteDock } from "./VoteDock";

export interface RoomBoardProps {
  viewModel: RoomViewModel;
  history: RoomHistoryEntry[];
  displayName: string;
  storyDraft: string;
  selectedVote: VoteValue | null;
  theme: ThemeMode;
  roomLink: string;
  busy?: boolean;
  onDisplayNameChange: (value: string) => void;
  onRename: () => void;
  onStoryChange: (value: string) => void;
  onSaveStory: () => void;
  onVote: (vote: VoteValue) => void;
  onClearVote: () => void;
  onReveal: () => void;
  onReset: () => void;
  onFinalize: () => void;
  onThrowReaction: (targetParticipantId: string, emoji: ThrowableReactionEmoji) => void;
  onTransferHost: (targetParticipantId: string) => void;
  onCopyLink: () => void;
  onNewRoom: () => void;
  onToggleTheme: () => void;
}

export function RoomBoard({
  viewModel,
  history,
  displayName,
  storyDraft,
  selectedVote,
  theme,
  roomLink,
  busy = false,
  onDisplayNameChange,
  onRename,
  onStoryChange,
  onSaveStory,
  onVote,
  onClearVote,
  onReveal,
  onReset,
  onFinalize,
  onThrowReaction,
  onTransferHost,
  onCopyLink,
  onNewRoom,
  onToggleTheme,
}: RoomBoardProps) {
  return (
    <div className="room-workspace">
      <RoomTopBar
        roomId={viewModel.roomId}
        roomLink={roomLink}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onNewRoom={onNewRoom}
        onCopyLink={onCopyLink}
      />

      <RoomHero story={viewModel.story} roomId={viewModel.roomId} />

      <main className="workspace-main">
        <div
          className={[
            "workspace-controls",
            viewModel.isHost ? "" : "workspace-controls--profile-only",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {viewModel.isHost ? (
            <StoryPanel
              storyDraft={storyDraft}
              canSetStory={viewModel.canSetStory}
              isFinalized={viewModel.isFinalized}
              busy={busy}
              onStoryChange={onStoryChange}
              onSaveStory={onSaveStory}
            />
          ) : null}

          <ProfilePanel
            displayName={displayName}
            busy={busy}
            onDisplayNameChange={onDisplayNameChange}
            onRename={onRename}
          />
        </div>

        <PokerTable
          viewModel={viewModel}
          busy={busy}
          onThrowReaction={onThrowReaction}
          onTransferHost={onTransferHost}
          onReset={onReset}
          onReveal={onReveal}
          onFinalize={onFinalize}
        />

        <HistoryPanel history={history} roomId={viewModel.roomId} />
      </main>
      <PublicFooter />

      <VoteDock
        selectedVote={selectedVote}
        busy={busy}
        canVote={viewModel.canVote}
        onVote={onVote}
        onClearVote={onClearVote}
      />
    </div>
  );
}
