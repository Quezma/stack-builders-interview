import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

import { parseEntries } from '../../src/adapters/hacker-news-parser.js'

const readFixture = (name) => readFile(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')

describe('parseEntries', () => {
  describe('given the real Hacker News front page', () => {
    let entries

    beforeAll(async () => {
      entries = parseEntries(await readFixture('hacker-news.html'))
    })

    it('reads every submission on the page', () => {
      expect(entries).toHaveLength(30)
    })

    it('reads title, rank, points and comments of a submission', () => {
      expect(entries[0]).toStrictEqual({
        rank: 1,
        title: 'My server is a phone now',
        points: 196,
        comments: 80
      })
    })

    it('numbers the entries in the order shown by the page', () => {
      const ranks = entries.map(({ rank }) => rank)

      expect(ranks).toStrictEqual(Array.from({ length: 30 }, (_, index) => index + 1))
    })

    it('reads a non empty title for every entry', () => {
      expect(entries.every(({ title }) => title.length > 0)).toBe(true)
    })

    it('reads points and comments as numbers for every entry', () => {
      const isCount = (value) => Number.isInteger(value) && value >= 0

      expect(entries.every(({ points, comments }) => isCount(points) && isCount(comments))).toBe(true)
    })
  })

  describe('given a real page whose submissions have no score and no comments', () => {
    let entries

    beforeAll(async () => {
      entries = parseEntries(await readFixture('hacker-news-jobs.html'))
    })

    it('still reads every submission', () => {
      expect(entries).toHaveLength(30)
    })

    it('defaults points and comments to zero', () => {
      expect(entries.every(({ points, comments }) => points === 0 && comments === 0)).toBe(true)
    })

    it('still reads their titles', () => {
      expect(entries.every(({ title }) => title.length > 0)).toBe(true)
    })
  })

  describe('given html without submissions', () => {
    it('reads no entries', () => {
      expect(parseEntries('<html><body><p>nothing here</p></body></html>')).toStrictEqual([])
    })
  })
})
