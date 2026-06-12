export function resolveHostTokenAfterJoin(isHost: boolean, participantToken: string): string {
  return isHost ? participantToken : "";
}
