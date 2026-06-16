export function resolveHostTokenAfterJoin(isHost: boolean, participantToken: string): string {
  return isHost ? participantToken : "";
}

export function shouldRestoreStoredSessionTokens(
  pathname: string,
  roomCodeQuery: string,
  storedRoomCode: string,
  participantToken: string,
): boolean {
  if (!participantToken) {
    return false;
  }

  if (pathname !== "/") {
    return false;
  }

  if (!roomCodeQuery) {
    return true;
  }

  return storedRoomCode === roomCodeQuery;
}
