import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createRunRepository, openDatabase } from '../../src/adapters/run-repository.js'

const anEntry = ({ rank, title, points = 0, comments = 0 }) => ({ rank, title, points, comments })

const someEntries = [
  anEntry({ rank: 1, title: 'My server is a phone now', points: 196, comments: 80 }),
  anEntry({ rank: 2, title: 'Short title', points: 12, comments: 3 })
]

const aRun = (overrides) => ({
  fetchedAt: '2026-08-09T06:12:00.000Z',
  durationMs: 412,
  filter: null,
  limit: null,
  entries: someEntries,
  ...overrides
})

describe('runRepository', () => {
  let repository

  beforeEach(() => {
    repository = createRunRepository(new DatabaseSync(':memory:'))
  })

  describe('saveRun', () => {
    describe('given a run', () => {
      it('returns the identifier of the stored run', () => {
        expect(repository.saveRun(aRun())).toBe(1)
      })

      it('gives each stored run a new identifier', () => {
        expect(repository.saveRun(aRun())).not.toBe(repository.saveRun(aRun()))
      })
    })

    describe('given entries that cannot all be stored', () => {
      const sharingRank = [
        anEntry({ rank: 1, title: 'First' }),
        anEntry({ rank: 1, title: 'Same rank as the first' })
      ]

      it('refuses the run and stores no part of it', () => {
        expect(() => repository.saveRun(aRun({ entries: sharingRank }))).toThrow()
        expect(repository.listRuns(10)).toStrictEqual([])
      })
    })

    describe('given a run without entries', () => {
      it('stores the run anyway', () => {
        const runId = repository.saveRun(aRun({ entries: [] }))

        expect(repository.findRun(runId).entries).toStrictEqual([])
      })
    })
  })

  describe('findRun', () => {
    describe('given a stored run', () => {
      it('reads back the run with its entries', () => {
        const run = aRun({ filter: 'long-titles', limit: 5 })
        const runId = repository.saveRun(run)

        expect(repository.findRun(runId)).toStrictEqual({ id: runId, ...run })
      })

      it('reads back a run that had no filter and no limit', () => {
        const runId = repository.saveRun(aRun())

        expect(repository.findRun(runId).filter).toStrictEqual(null)
        expect(repository.findRun(runId).limit).toStrictEqual(null)
      })

      it('reads the entries ordered by rank', () => {
        const runId = repository.saveRun(
          aRun({ entries: [anEntry({ rank: 3, title: 'Third' }), anEntry({ rank: 1, title: 'First' })] })
        )

        expect(repository.findRun(runId).entries.map(({ rank }) => rank)).toStrictEqual([1, 3])
      })

      it('keeps the entries of each run separated', () => {
        repository.saveRun(aRun())
        const second = repository.saveRun(aRun({ entries: [anEntry({ rank: 1, title: 'Only this one' })] }))

        expect(repository.findRun(second).entries).toHaveLength(1)
      })
    })

    describe('given an unknown identifier', () => {
      it('finds no run', () => {
        expect(repository.findRun(404)).toBe(null)
      })
    })
  })

  describe('lastRun', () => {
    describe('given several stored runs', () => {
      it('reads the most recently stored one', () => {
        repository.saveRun(aRun())
        repository.saveRun(aRun({ fetchedAt: '2026-08-09T07:40:00.000Z' }))

        expect(repository.lastRun().fetchedAt).toBe('2026-08-09T07:40:00.000Z')
      })
    })

    describe('given an empty repository', () => {
      it('finds no run', () => {
        expect(repository.lastRun()).toBe(null)
      })
    })
  })

  describe('listRuns', () => {
    describe('given more stored runs than requested', () => {
      beforeEach(() => {
        Array.from({ length: 5 }, (_, index) =>
          repository.saveRun(aRun({ fetchedAt: `2026-08-09T0${index}:00:00.000Z` }))
        )
      })

      it('reads only the most recent ones', () => {
        expect(repository.listRuns(3)).toHaveLength(3)
      })

      it('reads them from oldest to newest', () => {
        expect(repository.listRuns(3).map(({ id }) => id)).toStrictEqual([3, 4, 5])
      })

      it('reads each of them with its entries', () => {
        expect(repository.listRuns(3).every(({ entries }) => entries.length === 2)).toBe(true)
      })
    })

    describe('given fewer stored runs than requested', () => {
      it('reads every stored run', () => {
        repository.saveRun(aRun())

        expect(repository.listRuns(10)).toHaveLength(1)
      })
    })

    describe('given an empty repository', () => {
      it('lists no runs', () => {
        expect(repository.listRuns(10)).toStrictEqual([])
      })
    })
  })

  describe('given a database written by an earlier version of the schema', () => {
    const withoutRunStats = () => {
      const database = new DatabaseSync(':memory:')

      database.exec(`
        create table runs (
          id integer primary key autoincrement,
          fetched_at text not null
        );

        create table entries (
          run_id integer not null references runs (id) on delete cascade,
          rank integer not null,
          title text not null,
          points integer not null,
          comments integer not null,
          primary key (run_id, rank)
        );

        insert into runs (fetched_at) values ('2026-08-09T06:12:00.000Z');
        insert into entries values (1, 1, 'An older entry', 10, 5);
      `)

      return database
    }

    it('keeps the runs it already stored', () => {
      const repository = createRunRepository(withoutRunStats())

      expect(repository.findRun(1).entries).toHaveLength(1)
    })

    it('reads the missing statistics as unknown', () => {
      const repository = createRunRepository(withoutRunStats())

      expect(repository.findRun(1).durationMs).toBe(null)
      expect(repository.findRun(1).filter).toBe(null)
    })

    it('stores new runs with their statistics', () => {
      const repository = createRunRepository(withoutRunStats())

      const runId = repository.saveRun(aRun({ durationMs: 999, filter: 'short-titles' }))

      expect(repository.findRun(runId).durationMs).toBe(999)
      expect(repository.findRun(runId).filter).toBe('short-titles')
    })
  })

  describe('openDatabase', () => {
    describe('given a path on disk', () => {
      it('opens a database that survives being closed and reopened', async () => {
        const workspace = await mkdtemp(join(tmpdir(), 'web-crawler-'))
        const path = join(workspace, 'runs.db')

        const written = openDatabase(path)
        const runId = createRunRepository(written).saveRun(aRun())
        written.close()

        const reopened = openDatabase(path)

        expect(createRunRepository(reopened).findRun(runId).entries).toHaveLength(2)

        reopened.close()
        await rm(workspace, { recursive: true, force: true })
      })
    })
  })

  describe('given a repository created over an already migrated database', () => {
    it('keeps the previously stored runs', () => {
      const database = new DatabaseSync(':memory:')
      createRunRepository(database).saveRun(aRun())

      expect(createRunRepository(database).listRuns(10)).toHaveLength(1)
    })
  })
})
