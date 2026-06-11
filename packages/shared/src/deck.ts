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

export type VoteCard = (typeof FIBONACCI_DECK)[number];
