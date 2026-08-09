import { DatabaseSync } from 'node:sqlite'

const MIGRATIONS = [
  `create table if not exists runs (
     id integer primary key autoincrement,
     fetched_at text not null
   );

   create table if not exists entries (
     run_id integer not null references runs (id) on delete cascade,
     rank integer not null,
     title text not null,
     points integer not null,
     comments integer not null,
     primary key (run_id, rank)
   );`,

  `alter table runs add column duration_ms integer;
   alter table runs add column filter text;
   alter table runs add column entry_limit integer;`
]

const INSERT_RUN =
  'insert into runs (fetched_at, duration_ms, filter, entry_limit) values (?, ?, ?, ?)'
const INSERT_ENTRY = 'insert into entries (run_id, rank, title, points, comments) values (?, ?, ?, ?, ?)'
const RUN_FIELDS = 'id, fetched_at, duration_ms, filter, entry_limit'
const SELECT_RUN = `select ${RUN_FIELDS} from runs where id = ?`
const SELECT_LAST_RUN_ID = 'select id from runs order by id desc limit 1'
const SELECT_RECENT_RUN_IDS = 'select id from runs order by id desc limit ?'
const SELECT_ENTRIES = 'select rank, title, points, comments from entries where run_id = ? order by rank'

const versionOf = (database) => database.prepare('pragma user_version').get().user_version

const migrate = (database) => {
  MIGRATIONS.slice(versionOf(database)).forEach((migration, index) => {
    database.exec(migration)
    database.exec(`pragma user_version = ${versionOf(database) + index + 1}`)
  })
}

const toEntry = ({ rank, title, points, comments }) => ({ rank, title, points, comments })

const toRun = ({ id, fetched_at, duration_ms, filter, entry_limit }, entries) => ({
  id,
  fetchedAt: fetched_at,
  durationMs: duration_ms,
  filter,
  limit: entry_limit,
  entries
})

export const openDatabase = (path) => new DatabaseSync(path)

export const createRunRepository = (database) => {
  migrate(database)

  const insertRun = database.prepare(INSERT_RUN)
  const insertEntry = database.prepare(INSERT_ENTRY)
  const selectRun = database.prepare(SELECT_RUN)
  const selectLastRunId = database.prepare(SELECT_LAST_RUN_ID)
  const selectRecentRunIds = database.prepare(SELECT_RECENT_RUN_IDS)
  const selectEntries = database.prepare(SELECT_ENTRIES)

  const findRun = (id) => {
    const run = selectRun.get(id)

    return run ? toRun(run, selectEntries.all(id).map(toEntry)) : null
  }

  const saveRun = ({ fetchedAt, durationMs, filter, limit, entries }) => {
    database.exec('begin')

    try {
      const runId = Number(insertRun.run(fetchedAt, durationMs, filter, limit).lastInsertRowid)

      entries.forEach(({ rank, title, points, comments }) =>
        insertEntry.run(runId, rank, title, points, comments)
      )

      database.exec('commit')

      return runId
    } catch (error) {
      database.exec('rollback')
      throw error
    }
  }

  const lastRun = () => {
    const last = selectLastRunId.get()

    return last ? findRun(last.id) : null
  }

  const listRuns = (count) =>
    selectRecentRunIds
      .all(count)
      .map(({ id }) => findRun(id))
      .reverse()

  return { saveRun, findRun, lastRun, listRuns }
}
