import { describe, it, expect } from 'vitest'

import { longTitlesByComments, shortTitlesByPoints } from '../../src/domain/filters.js'

const entry = ({ rank, title, points = 0, comments = 0 }) => ({ rank, title, points, comments })

const entries = [
  entry({ rank: 1, title: 'A very long title with many words', points: 10, comments: 5 }),
  entry({ rank: 2, title: 'Short title here', points: 300, comments: 400 }),
  entry({ rank: 3, title: 'Another title that clearly exceeds five words', points: 20, comments: 90 }),
  entry({ rank: 4, title: 'Exactly five words in title', points: 50, comments: 1 }),
  entry({ rank: 5, title: 'Tiny', points: 700, comments: 2 })
]

describe('longTitlesByComments', () => {
  describe('given a list of entries', () => {
    it('keeps only titles with more than five words', () => {
      const titles = longTitlesByComments(entries).map(({ title }) => title)

      expect(titles).toStrictEqual([
        'Another title that clearly exceeds five words',
        'A very long title with many words'
      ])
    })

    it('orders the kept entries by comments in descending order', () => {
      const comments = longTitlesByComments(entries).map(({ comments }) => comments)

      expect(comments).toStrictEqual([90, 5])
    })

    it('does not mutate the received list', () => {
      const original = [...entries]

      longTitlesByComments(entries)

      expect(entries).toStrictEqual(original)
    })
  })

  describe('given entries with the same amount of comments', () => {
    it('preserves their original order', () => {
      const tied = [
        entry({ rank: 1, title: 'First long title with six words', comments: 7 }),
        entry({ rank: 2, title: 'Second long title with six words', comments: 7 })
      ]

      const ranks = longTitlesByComments(tied).map(({ rank }) => rank)

      expect(ranks).toStrictEqual([1, 2])
    })
  })

  describe('given an empty list', () => {
    it('returns an empty list', () => {
      expect(longTitlesByComments([])).toStrictEqual([])
    })
  })
})

describe('shortTitlesByPoints', () => {
  describe('given a list of entries', () => {
    it('keeps only titles with five words or fewer', () => {
      const titles = shortTitlesByPoints(entries).map(({ title }) => title)

      expect(titles).toStrictEqual(['Tiny', 'Short title here', 'Exactly five words in title'])
    })

    it('orders the kept entries by points in descending order', () => {
      const points = shortTitlesByPoints(entries).map(({ points }) => points)

      expect(points).toStrictEqual([700, 300, 50])
    })

    it('does not mutate the received list', () => {
      const original = [...entries]

      shortTitlesByPoints(entries)

      expect(entries).toStrictEqual(original)
    })
  })

  describe('given entries with the same amount of points', () => {
    it('preserves their original order', () => {
      const tied = [
        entry({ rank: 1, title: 'First short title', points: 42 }),
        entry({ rank: 2, title: 'Second short title', points: 42 })
      ]

      const ranks = shortTitlesByPoints(tied).map(({ rank }) => rank)

      expect(ranks).toStrictEqual([1, 2])
    })
  })

  describe('given an empty list', () => {
    it('returns an empty list', () => {
      expect(shortTitlesByPoints([])).toStrictEqual([])
    })
  })
})
