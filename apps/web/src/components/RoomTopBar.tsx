import { useState } from "react";
import { HELP_PATH } from "../lib/publicPages";
import type { ThemeMode } from "../lib/theme";
import { AppLogo } from "./AppLogo";
import { QrCodeModal } from "./QrCodeModal";
import { ThemeToggleButton } from "./ThemeToggleButton";

export interface RoomTopBarProps {
  roomId: string;
  roomLink: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNewRoom: () => void;
  onCopyLink: () => void;
}

export function RoomTopBar({
  roomId,
  roomLink,
  theme,
  onToggleTheme,
  onNewRoom,
  onCopyLink,
}: RoomTopBarProps) {
  const [qrModalOpen, setQrModalOpen] = useState(false);

  return (
    <>
      <header className="workspace-topbar">
        <div className="brand-lockup">
          <AppLogo />
          <div>
            <strong>LealPlanningPoker</strong>
            <span>Room {roomId}</span>
          </div>
          <button
            className="button button--quiet button--compact"
            type="button"
            onClick={onNewRoom}
          >
            New room
          </button>
        </div>

        <div className="topbar-actions">
          <a
            className="button button--quiet button--link"
            href={HELP_PATH}
            target="_blank"
            rel="noreferrer"
          >
            Help
          </a>
          <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
          <button className="button button--quiet" type="button" onClick={onCopyLink}>
            Copy link
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={() => setQrModalOpen(true)}
          >
            QR
          </button>
        </div>
      </header>
      <QrCodeModal url={roomLink} open={qrModalOpen} onClose={() => setQrModalOpen(false)} />
    </>
  );
}
