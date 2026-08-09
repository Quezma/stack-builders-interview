import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

import { createRunRepository } from '../src/adapters/run-repository.js'

const execute = promisify(execFile)

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url))

const someEntries = [
  { rank: 1, title: 'A very long title with many words', points: 10, comments: 5 },
  { rank: 2, title: 'Short title', points: 300, comments: 400 }
]

describe('web-crawler command line', () => {
  let workspace
  let databasePath

  const runCli = (args) =>
    execute(process.execPath, ['--disable-warning=ExperimentalWarning', CLI, ...args, '--db', databasePath])

  beforeAll(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'web-crawler-'))
    databasePath = join(workspace, 'runs.db')

    const database = new DatabaseSync(databasePath)
    const repository = createRunRepository(database)

    repository.saveRun({
      fetchedAt: '2026-08-09T06:12:00.000Z',
      durationMs: 412,
      filter: 'long-titles',
      limit: 5,
      entries: someEntries
    })
    repository.saveRun({
      fetchedAt: '2026-08-09T07:40:00.000Z',
      durationMs: 128,
      filter: null,
      limit: null,
      entries: someEntries
    })

    database.close()
  })

  afterAll(() => rm(workspace, { recursive: true, force: true }))

  describe('history', () => {
    describe('given no run is requested', () => {
      it('lists every stored run', async () => {
        const { stdout } = await runCli(['history'])

        expect(stdout).toMatch(/2026-08-09 06:12:00/)
        expect(stdout).toMatch(/2026-08-09 07:40:00/)
      })
    })

    describe('given no sort order is requested', () => {
      it('lists the most recent run first', async () => {
        const { stdout } = await runCli(['history'])

        expect(stdout.indexOf('07:40:00') < stdout.indexOf('06:12:00')).toBe(true)
      })
    })

    describe('given the oldest first order', () => {
      it('lists the oldest run first', async () => {
        const { stdout } = await runCli(['history', '--sort=oldest'])

        expect(stdout.indexOf('06:12:00') < stdout.indexOf('07:40:00')).toBe(true)
      })
    })

    describe('given an unknown sort order', () => {
      it('refuses it', async () => {
        await expect(runCli(['history', '--sort=sideways'])).rejects.toThrow(/Allowed choices/)
      })
    })

    describe('given a run is requested by identifier', () => {
      it('reports the statistics of that run alone', async () => {
        const { stdout } = await runCli(['history', '--run=1'])

        expect(stdout).toMatch(/412 ms/)
        expect(stdout).toMatch(/long-titles/)
        expect(stdout).not.toMatch(/128 ms/)
      })
    })

    describe('given the last run is requested', () => {
      it('reports the statistics of the most recent run', async () => {
        const { stdout } = await runCli(['history', '--last'])

        expect(stdout).toMatch(/128 ms/)
        expect(stdout).not.toMatch(/412 ms/)
      })
    })

    describe('given both the last run and an identifier are requested', () => {
      it('refuses to guess which one was meant', async () => {
        await expect(runCli(['history', '--last', '--run=1'])).rejects.toThrow(/cannot be used with/)
      })
    })

    describe('given an unknown run is requested', () => {
      it('fails', async () => {
        await expect(runCli(['history', '--run=999'])).rejects.toMatchObject({ code: 1 })
      })
    })

    describe('given the json format', () => {
      it('reports the statistics as json', async () => {
        const { stdout } = await runCli(['history', '--run=1', '--format=json'])

        expect(JSON.parse(stdout)).toStrictEqual({
          id: 1,
          fetchedAt: '2026-08-09T06:12:00.000Z',
          durationMs: 412,
          filter: 'long-titles',
          limit: 5,
          entryCount: 2,
          shownCount: 1
        })
      })
    })
  })

  describe('crawling a stored run', () => {
    it('renders its entries without reaching the network', async () => {
      const { stdout } = await runCli(['--run=1', '--filter=long-titles'])

      expect(stdout).toMatch(/A very long title with many words/)
      expect(stdout).not.toMatch(/Short title/)
    })
  })
})
