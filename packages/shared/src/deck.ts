export const FIBONACCI_DECK = [
  "0",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "?",
  "coffee"
] as const;

export type BuiltInVoteCard = (typeof FIBONACCI_DECK)[number];
export type VoteCard = string;

const BUILT_IN_VOTE_CARDS = new Set<string>(FIBONACCI_DECK);
const CUSTOM_WHOLE_NUMBER_PATTERN = /^(0|[1-9]\d*)$/;

export function isBuiltInVoteCard(value: string): value is BuiltInVoteCard {
  return BUILT_IN_VOTE_CARDS.has(value);
}

export function normalizeVoteCard(value: string): VoteCard | null {
  const normalized = value.trim();
  if (isBuiltInVoteCard(normalized) || CUSTOM_WHOLE_NUMBER_PATTERN.test(normalized)) {
    return normalized;
  }

  return null;
}

export function isVoteCard(value: string): value is VoteCard {
  return normalizeVoteCard(value) !== null;
}
