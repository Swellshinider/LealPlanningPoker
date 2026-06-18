// Small read/write helpers around window.location. Each guards for the absence
// of `window` (e.g. during server-side rendering or in the node test runner),
// returning a safe no-op value so callers never throw on a missing DOM.

export function readRoomQuery(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const value = new URLSearchParams(window.location.search).get("room") ?? "";
  return value.toUpperCase();
}

export function readPathname(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.pathname || "/";
}

export function buildRoomLink(roomCode: string): string {
  if (typeof window === "undefined" || !roomCode) {
    return "";
  }

  const url = new URL(window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

export function clearRoomQuery(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState(null, "", url.toString());
}
