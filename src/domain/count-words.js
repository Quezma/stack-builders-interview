const CONTAINS_ALPHANUMERIC = /\p{L}|\p{N}/u

const isWord = (text) => CONTAINS_ALPHANUMERIC.test(text)

export const countWords = (title) => title.split(/\s+/).filter(isWord).length
