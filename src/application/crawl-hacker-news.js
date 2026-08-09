import { longTitlesByComments, shortTitlesByPoints } from '../domain/filters.js'

const LAST_RUN = 'last'
const NEWEST_FIRST = 'newest'

const FILTERS = {
  'long-titles': longTitlesByComments,
  'short-titles': shortTitlesByPoints
}

const keepAll = (entries) => entries

const filterFor = (filter) => FILTERS[filter] ?? keepAll

const limitTo = (limit) => (entries) => (limit ? entries.slice(0, limit) : entries)

const viewOf = ({ filter, limit }) => (entries) => limitTo(limit)(filterFor(filter)(entries))

const requestedIn = ({ filter, limit }) => ({ filter: filter ?? null, limit: limit ?? null })

const statsOf = (run, view) => ({
  id: run.id,
  fetchedAt: run.fetchedAt,
  durationMs: run.durationMs,
  filter: view.filter,
  limit: view.limit,
  entryCount: run.entries.length,
  shownCount: viewOf(view)(run.entries).length
})

const ordered = (runs, order) => (order === NEWEST_FIRST ? runs.toReversed() : runs)

export const createCrawler = ({ fetchEntries, repository, clock }) => {
  const fetchAndStoreRun = async (view) => {
    const startedAt = clock()
    const entries = await fetchEntries()

    const run = {
      fetchedAt: new Date(startedAt).toISOString(),
      durationMs: clock() - startedAt,
      ...view,
      entries
    }

    return { id: repository.saveRun(run), ...run }
  }

  const readLastRun = () => {
    const run = repository.lastRun()

    if (!run) throw new Error('There are no stored runs yet')

    return run
  }

  const readRun = (run) => {
    if (run === LAST_RUN) return readLastRun()

    const stored = repository.findRun(run)

    if (!stored) throw new Error(`Run ${run} was not found`)

    return stored
  }

  const crawl = async ({ run, filter, limit }) => {
    const view = requestedIn({ filter, limit })
    const source = run === undefined ? await fetchAndStoreRun(view) : readRun(run)

    return { stats: statsOf(source, view), entries: viewOf(view)(source.entries) }
  }

  const runStats = (run) => {
    const stored = readRun(run)

    return statsOf(stored, stored)
  }

  const recentRuns = ({ count, order = NEWEST_FIRST }) =>
    ordered(repository.listRuns(count), order).map((run) => statsOf(run, run))

  return { crawl, runStats, recentRuns }
}
