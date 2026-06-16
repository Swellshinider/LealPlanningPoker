export const FIBONACCI_DECK = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "coffee"] as const;

export type BuiltInVoteCard = (typeof FIBONACCI_DECK)[number];
export type VoteCard = string;
export const MAX_CUSTOM_VOTE_DIGITS = 4;

const BUILT_IN_VOTE_CARDS = new Set<string>(FIBONACCI_DECK);
const CUSTOM_WHOLE_NUMBER_PATTERN = new RegExp(`^\\d{1,${MAX_CUSTOM_VOTE_DIGITS}}$`);

export function isBuiltInVoteCard(value: string): value is BuiltInVoteCard {
  return BUILT_IN_VOTE_CARDS.has(value);
}

export function normalizeVoteCard(value: string): VoteCard | null {
  const normalized = value.trim();
  if (isBuiltInVoteCard(normalized)) {
    return normalized;
  }

  if (CUSTOM_WHOLE_NUMBER_PATTERN.test(normalized)) {
    return normalized.replace(/^0+(?=\d)/, "");
  }

  return null;
}

export function isVoteCard(value: string): value is VoteCard {
  return normalizeVoteCard(value) !== null;
}
