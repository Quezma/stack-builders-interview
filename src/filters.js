const WORD_THRESHOLD = 5;

const descBy = (key) => (a, b) => b[key] - a[key];

export const FILTERS = {
  // Titles with MORE than five words, ordered by number of comments.
  long: {
    id: 'long',
    description: 'titles with more than 5 words, ordered by comments (desc)',
    apply: (entries) =>
      entries.filter((e) => e.wordCount > WORD_THRESHOLD).sort(descBy('comments')),
  },
  // Titles with five words or fewer, ordered by points.
  short: {
    id: 'short',
    description: 'titles with 5 words or fewer, ordered by points (desc)',
    apply: (entries) =>
      entries.filter((e) => e.wordCount <= WORD_THRESHOLD).sort(descBy('points')),
  },
};

export const FILTER_IDS = Object.keys(FILTERS);

export function applyFilter(filterId, entries) {
  const filter = FILTERS[filterId];
  if (!filter) throw new Error(`Unknown filter "${filterId}". Use: ${FILTER_IDS.join(', ')}`);
  return { filter, entries: filter.apply(entries) };
}
