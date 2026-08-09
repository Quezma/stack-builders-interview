import { load } from 'cheerio'

const SUBMISSION_ROW = 'tr.athing.submission'
const RANK = '.rank'
const TITLE_LINK = '.titleline > a'
const SUBLINE = '.subline'
const SCORE = '.score'

const firstNumberIn = (text) => Number(text.match(/\d+/)?.[0] ?? 0)

const commentsLabelOf = (subline) => {
  const lastLink = subline.find('a').last().text()

  return lastLink.includes('comment') ? lastLink : ''
}

const toEntry = ($) => (element) => {
  const row = $(element)
  const subline = row.next().find(SUBLINE)

  return {
    rank: firstNumberIn(row.find(RANK).text()),
    title: row.find(TITLE_LINK).first().text().trim(),
    points: firstNumberIn(subline.find(SCORE).text()),
    comments: firstNumberIn(commentsLabelOf(subline))
  }
}

export const parseEntries = (html) => {
  const $ = load(html)

  return $(SUBMISSION_ROW).toArray().map(toEntry($))
}
