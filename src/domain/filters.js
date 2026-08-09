import { countWords } from './count-words.js'

const SHORT_TITLE_MAX_WORDS = 5

const hasLongTitle = ({ title }) => countWords(title) > SHORT_TITLE_MAX_WORDS

const hasShortTitle = (entry) => !hasLongTitle(entry)

const descendingBy = (readValue) => (left, right) => readValue(right) - readValue(left)

const byComments = descendingBy(({ comments }) => comments)

const byPoints = descendingBy(({ points }) => points)

export const longTitlesByComments = (entries) => entries.filter(hasLongTitle).toSorted(byComments)

export const shortTitlesByPoints = (entries) => entries.filter(hasShortTitle).toSorted(byPoints)
