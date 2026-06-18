import { useCallback, useEffect, useRef, useState } from "react";

export type NoticeTone = "info" | "success" | "error";

export interface Notice {
  tone: NoticeTone;
  text: string;
}

export interface NoticeApi {
  notice: Notice | null;
  showNotice: (tone: NoticeTone, text: string) => void;
  clearNotice: () => void;
}

const NOTICE_TIMEOUT_MS = 4_000;

// Owns the transient banner message shown above the workspace. `showNotice`
// clears any pending timer before showing the next message so only the most
// recent notice is visible, and re-arms a 4s auto-dismiss. The timer is
// cleared on unmount so no setState lands after the component is gone.
export function useNotice(): NoticeApi {
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNoticeTimer = useCallback(() => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, []);

  const showNotice = useCallback(
    (tone: NoticeTone, text: string) => {
      clearNoticeTimer();
      setNotice({ tone, text });
      noticeTimerRef.current = setTimeout(() => {
        noticeTimerRef.current = null;
        setNotice(null);
      }, NOTICE_TIMEOUT_MS);
    },
    [clearNoticeTimer],
  );

  const clearNotice = useCallback(() => {
    clearNoticeTimer();
    setNotice(null);
  }, [clearNoticeTimer]);

  useEffect(() => () => clearNoticeTimer(), [clearNoticeTimer]);

  return { notice, showNotice, clearNotice };
}
