import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'

import { createCrawler } from '../../src/application/crawl-hacker-news.js'
import { createRunRepository } from '../../src/adapters/run-repository.js'
import { parseEntries } from '../../src/adapters/hacker-news-parser.js'
import { countWords } from '../../src/domain/count-words.js'

const STARTED_AT = Date.parse('2026-08-09T06:12:00.000Z')
const FETCHED_AT = '2026-08-09T06:12:00.000Z'
const DURATION_MS = 412

const readFixture = (name) => readFile(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')

const clockTicking = () => {
  const readings = [STARTED_AT, STARTED_AT + DURATION_MS]
  let tick = 0

  return () => readings[Math.min(tick++, readings.length - 1)]
}

const unreachableNetwork = () => {
  throw new Error('the network should not be reached')
}

describe('crawler', () => {
  let frontPage
  let repository
  let crawler

  beforeAll(async () => {
    frontPage = await readFixture('hacker-news.html')
  })

  const crawlerReading = (fetchEntries) =>
    createCrawler({ fetchEntries, repository, clock: clockTicking() })

  beforeEach(() => {
    repository = createRunRepository(new DatabaseSync(':memory:'))
    crawler = crawlerReading(async () => parseEntries(frontPage))
  })

  describe('crawl', () => {
    describe('given no run is requested', () => {
      it('reads every entry of the fetched page', async () => {
        const { entries } = await crawler.crawl({})

        expect(entries).toHaveLength(30)
      })

      it('keeps the entries in the order shown by the page', async () => {
        const { entries } = await crawler.crawl({})

        const ranks = entries.map(({ rank }) => rank)

        expect(ranks).toStrictEqual(Array.from({ length: 30 }, (_, index) => index + 1))
      })

      it('stores the fetched entries as a new run', async () => {
        const { stats: { id: runId } } = await crawler.crawl({})

        expect(repository.findRun(runId).entries).toHaveLength(30)
      })

      it('stores the run stamped with the time the fetch started', async () => {
        const { stats: { id: runId, fetchedAt } } = await crawler.crawl({})

        expect(fetchedAt).toBe(FETCHED_AT)
        expect(repository.findRun(runId).fetchedAt).toBe(FETCHED_AT)
      })

      it('stores how long the fetch took', async () => {
        const { stats: { id: runId } } = await crawler.crawl({})

        expect(repository.findRun(runId).durationMs).toBe(DURATION_MS)
      })

      it('stores that no filter and no limit were requested', async () => {
        const { stats: { id: runId } } = await crawler.crawl({})

        expect(repository.findRun(runId).filter).toBe(null)
        expect(repository.findRun(runId).limit).toBe(null)
      })

      it('reports what this crawl did', async () => {
        const { stats } = await crawler.crawl({ filter: 'short-titles', limit: 4 })

        expect(stats).toStrictEqual({
          id: 1,
          fetchedAt: FETCHED_AT,
          durationMs: DURATION_MS,
          filter: 'short-titles',
          limit: 4,
          entryCount: 30,
          shownCount: 4
        })
      })
    })

    describe('given the long titles filter', () => {
      it('keeps only entries whose title has more than five words', async () => {
        const { entries } = await crawler.crawl({ filter: 'long-titles' })

        expect(entries.length).toBeGreaterThan(0)
        expect(entries.every(({ title }) => countWords(title) > 5)).toBe(true)
      })

      it('orders them by comments in descending order', async () => {
        const { entries } = await crawler.crawl({ filter: 'long-titles' })
        const comments = entries.map(({ comments }) => comments)

        expect(comments).toStrictEqual([...comments].sort((left, right) => right - left))
      })

      it('stores the fetched entries unfiltered', async () => {
        const { stats: { id: runId } } = await crawler.crawl({ filter: 'long-titles' })

        expect(repository.findRun(runId).entries).toHaveLength(30)
      })

      it('stores which filter was requested', async () => {
        const { stats: { id: runId } } = await crawler.crawl({ filter: 'long-titles', limit: 5 })

        expect(repository.findRun(runId).filter).toBe('long-titles')
        expect(repository.findRun(runId).limit).toBe(5)
      })
    })

    describe('given the short titles filter', () => {
      it('keeps only entries whose title has five words or fewer', async () => {
        const { entries } = await crawler.crawl({ filter: 'short-titles' })

        expect(entries.length).toBeGreaterThan(0)
        expect(entries.every(({ title }) => countWords(title) <= 5)).toBe(true)
      })

      it('orders them by points in descending order', async () => {
        const { entries } = await crawler.crawl({ filter: 'short-titles' })
        const points = entries.map(({ points }) => points)

        expect(points).toStrictEqual([...points].sort((left, right) => right - left))
      })
    })

    describe('given a limit', () => {
      it('returns at most that amount of entries', async () => {
        const { entries } = await crawler.crawl({ limit: 5 })

        expect(entries).toHaveLength(5)
      })

      it('applies the limit after filtering, not before', async () => {
        const { entries: filtered } = await crawler.crawl({ filter: 'short-titles' })
        const { entries: limited } = await crawler.crawl({ filter: 'short-titles', limit: 3 })

        expect(limited).toStrictEqual(filtered.slice(0, 3))
      })

      describe('and the limit exceeds the available entries', () => {
        it('returns every available entry', async () => {
          const { entries } = await crawler.crawl({ limit: 100 })

          expect(entries).toHaveLength(30)
        })
      })
    })

    describe('given a stored run is requested by identifier', () => {
      let storedRunId

      beforeEach(async () => {
        storedRunId = (await crawler.crawl({})).stats.id
        crawler = crawlerReading(unreachableNetwork)
      })

      it('reads the entries without fetching the page again', async () => {
        const { entries } = await crawler.crawl({ run: storedRunId })

        expect(entries).toHaveLength(30)
      })

      it('reports the requested run', async () => {
        const { stats: { id: runId, fetchedAt } } = await crawler.crawl({ run: storedRunId })

        expect(runId).toBe(storedRunId)
        expect(fetchedAt).toBe(FETCHED_AT)
      })

      it('does not store a new run', async () => {
        await crawler.crawl({ run: storedRunId })

        expect(repository.listRuns(10)).toHaveLength(1)
      })

      it('filters the stored entries with the same rules', async () => {
        const { entries } = await crawler.crawl({ run: storedRunId, filter: 'long-titles' })

        expect(entries.every(({ title }) => countWords(title) > 5)).toBe(true)
      })

      it('reports the filter asked for now, not the one the run was stored with', async () => {
        const { stats } = await crawler.crawl({ run: storedRunId, filter: 'long-titles' })

        expect(stats.filter).toBe('long-titles')
        expect(repository.findRun(storedRunId).filter).toBe(null)
      })

      it('reports how long the stored run had taken to fetch', async () => {
        const { stats } = await crawler.crawl({ run: storedRunId })

        expect(stats.durationMs).toBe(DURATION_MS)
      })
    })

    describe('given the last stored run is requested', () => {
      it('reads the most recently stored run', async () => {
        await crawler.crawl({})
        const secondRunId = (await crawler.crawl({})).stats.id
        crawler = crawlerReading(unreachableNetwork)

        const { stats: { id: runId } } = await crawler.crawl({ run: 'last' })

        expect(runId).toBe(secondRunId)
      })

      describe('and nothing was ever stored', () => {
        it('fails explaining that there is no stored run', async () => {
          await expect(crawler.crawl({ run: 'last' })).rejects.toThrow(/no stored runs/i)
        })
      })
    })

    describe('given an unknown run is requested', () => {
      it('fails naming the missing run', async () => {
        await expect(crawler.crawl({ run: 404 })).rejects.toThrow(/run 404/i)
      })
    })
  })

  describe('runStats', () => {
    describe('given a stored run', () => {
      it('reports what the run did', async () => {
        const { stats: { id: runId } } = await crawler.crawl({ filter: 'short-titles', limit: 3 })

        expect(crawler.runStats(runId)).toStrictEqual({
          id: runId,
          fetchedAt: FETCHED_AT,
          durationMs: DURATION_MS,
          filter: 'short-titles',
          limit: 3,
          entryCount: 30,
          shownCount: 3
        })
      })

      it('counts every entry as shown when no filter was requested', async () => {
        const { stats: { id: runId } } = await crawler.crawl({})

        expect(crawler.runStats(runId).shownCount).toBe(30)
      })

      it('recomputes how many entries the filter kept', async () => {
        const { stats: { id: runId } } = await crawler.crawl({ filter: 'long-titles' })
        const { entries } = await crawler.crawl({ run: runId, filter: 'long-titles' })

        expect(crawler.runStats(runId).shownCount).toBe(entries.length)
      })
    })

    describe('given the last stored run', () => {
      it('reports the most recently stored one', async () => {
        await crawler.crawl({})
        const { stats: { id: runId } } = await crawler.crawl({})

        expect(crawler.runStats('last').id).toBe(runId)
      })

      describe('and nothing was ever stored', () => {
        it('fails explaining that there is no stored run', () => {
          expect(() => crawler.runStats('last')).toThrow(/no stored runs/i)
        })
      })
    })

    describe('given an unknown run', () => {
      it('fails naming the missing run', () => {
        expect(() => crawler.runStats(404)).toThrow(/run 404/i)
      })
    })
  })

  describe('recentRuns', () => {
    describe('given more stored runs than requested', () => {
      beforeEach(async () => {
        await crawler.crawl({})
        await crawler.crawl({})
        await crawler.crawl({})
      })

      it('reports only the most recent ones', () => {
        expect(crawler.recentRuns({ count: 2 })).toHaveLength(2)
      })

      it('reports them newest first when asked for that order', () => {
        expect(crawler.recentRuns({ count: 2, order: 'newest' }).map(({ id }) => id)).toStrictEqual([3, 2])
      })

      it('reports them oldest first when asked for that order', () => {
        expect(crawler.recentRuns({ count: 2, order: 'oldest' }).map(({ id }) => id)).toStrictEqual([2, 3])
      })

      it('reports them newest first when no order is asked for', () => {
        expect(crawler.recentRuns({ count: 3 }).map(({ id }) => id)).toStrictEqual([3, 2, 1])
      })
    })

    describe('given a single stored run', () => {
      it('reports the same statistics as that run alone', async () => {
        const { stats } = await crawler.crawl({ filter: 'long-titles' })

        expect(crawler.recentRuns({ count: 1 })).toStrictEqual([crawler.runStats(stats.id)])
      })
    })

    describe('given nothing was ever stored', () => {
      it('reports no run', () => {
        expect(crawler.recentRuns({ count: 10 })).toStrictEqual([])
      })
    })
  })
})
