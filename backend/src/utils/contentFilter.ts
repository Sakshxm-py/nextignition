/**
 * Minimal built-in profanity / slur filter. Intentionally dependency-free: a
 * small hardcoded English word list, matched case-insensitively on word
 * boundaries. This provides the proactive content-filtering method required by
 * App Store Guideline 1.2 (objectionable user-generated content) without
 * pulling in an external package.
 */

// A reasonable set of common profanity and slurs. Kept compact on purpose.
const PROFANITY_WORDS: string[] = [
  'fuck',
  'fucker',
  'fucking',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'bastard',
  'asshole',
  'dickhead',
  'cunt',
  'pussy',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'chink',
  'kike',
  'wetback',
  'twat',
  'wanker',
  'douchebag',
  // NOTE: deliberately excluded innocent-homograph words ('cock', 'fag', 'spic',
  // 'dyke', 'tranny', 'jackass') that would reject legitimate messages
  // (e.g. UK "fag" = cigarette, "dyke" = levee/surname, "spic and span").
];

// Build a single case-insensitive, word-boundary regex. The `\b` boundaries
// ensure we match whole words (so "class" won't trip on "ass", etc.).
const PROFANITY_REGEX = new RegExp(
  `\\b(${PROFANITY_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi'
);

/** True if `text` contains any blacklisted profanity/slur. */
export const containsProfanity = (text: string): boolean => {
  if (!text) return false;
  // Reset lastIndex since the regex is global and stateful when reused.
  PROFANITY_REGEX.lastIndex = 0;
  return PROFANITY_REGEX.test(String(text));
};

/** Replace any matched profanity with asterisks of the same length. */
export const filterProfanity = (text: string): string => {
  if (!text) return text;
  return String(text).replace(PROFANITY_REGEX, (match) => '*'.repeat(match.length));
};
