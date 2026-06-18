import { getPublicPage } from "./lib/publicPages";
import { readPathname } from "./lib/roomUrl";
import { useLocalStorageSession } from "./hooks/useLocalStorageSession";
import { useNotice } from "./hooks/useNotice";
import { useRoomSession } from "./hooks/useRoomSession";
import { useTheme } from "./hooks/useTheme";
import { HelpPage } from "./components/HelpPage";
import { JoinPanel } from "./components/JoinPanel";
import { RoomBoard } from "./components/RoomBoard";

export function App() {
  const pathname = readPathname();
  const publicPage = getPublicPage(pathname);

  const session = useLocalStorageSession();
  const { notice, showNotice, clearNotice } = useNotice();
  const { theme, toggleTheme } = useTheme();
  const roomSession = useRoomSession({
    session,
    showNotice,
    clearNotice,
    publicPage,
  });

  const bannerText = notice ? notice.text : null;
  const bannerTone = notice?.tone ?? "info";

  if (!roomSession.snapshot || !roomSession.viewModel) {
    return (
      <main className="app-shell">
        {publicPage === "help" ? (
          <HelpPage theme={theme} onToggleTheme={toggleTheme} />
        ) : (
          <JoinPanel
            busy={roomSession.busy}
            displayName={session.displayName}
            roomCode={session.roomCode}
            theme={theme}
            autoFocusName={Boolean(session.roomCode) && !session.displayName.trim()}
            onCreateRoom={() => void roomSession.createPlanningRoom()}
            onDisplayNameChange={session.setDisplayName}
            onJoinRoom={() => void roomSession.joinPlanningRoom()}
            onRoomCodeChange={session.setRoomCode}
            onToggleTheme={toggleTheme}
          />
        )}
        {bannerText ? (
          <div className={`floating-banner floating-banner--${bannerTone}`}>{bannerText}</div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="app-shell app-shell--room">
      <RoomBoard
        busy={roomSession.busy}
        displayName={session.displayName}
        history={roomSession.snapshot.history}
        selectedVote={roomSession.selectedVote}
        storyDraft={roomSession.storyDraft}
        theme={theme}
        roomLink={roomSession.roomLink}
        viewModel={roomSession.viewModel}
        onCopyLink={() => void roomSession.copyRoomLink()}
        onDisplayNameChange={session.setDisplayName}
        onFinalize={() => void roomSession.finalizeCurrentStory()}
        onNewRoom={roomSession.startNewRoom}
        onRename={() => void roomSession.renameSelf()}
        onReset={() => void roomSession.resetRoomVotes()}
        onReveal={() => void roomSession.revealRoomVotes()}
        onSaveStory={() => void roomSession.persistStory()}
        onStoryChange={roomSession.setStoryDraft}
        onThrowReaction={roomSession.sendReaction}
        onTransferHost={(participantId) => void roomSession.changeHost(participantId)}
        onToggleTheme={toggleTheme}
        onVote={(vote) => void roomSession.castVote(vote)}
        onClearVote={() => void roomSession.clearVote()}
      />
      {bannerText ? (
        <div className={`floating-banner floating-banner--${bannerTone}`}>{bannerText}</div>
      ) : null}
    </main>
  );
}
