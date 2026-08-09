import { renderTable } from './table.js'

const PANEL_PADDING = 2
const PANEL_VERTICAL_PADDING = 1

const shortTimestamp = (isoTimestamp) => isoTimestamp.slice(0, 19).replace('T', ' ')

const durationLabel = (durationMs) => (Number.isInteger(durationMs) ? `${durationMs} ms` : 'unknown')

const filterLabel = (filter) => filter ?? 'none'

const limitLabel = (limit) => (Number.isInteger(limit) ? String(limit) : 'none')

const entriesLabel = (count) => `${count} entries`

const ENTRY_COLUMNS = [
  { header: 'RANK', align: 'right', read: ({ rank }) => rank, color: 'dim' },
  { header: 'POINTS', align: 'right', read: ({ points }) => points, color: 'yellow' },
  { header: 'COMMENTS', align: 'right', read: ({ comments }) => comments, color: 'cyan' },
  { header: 'TITLE', align: 'left', read: ({ title }) => title, flexible: true }
]

const RUN_COLUMNS = [
  { header: 'RUN', align: 'right', read: ({ id }) => id, color: 'cyan' },
  { header: 'FETCHED AT', align: 'left', read: ({ fetchedAt }) => shortTimestamp(fetchedAt), color: 'dim' },
  { header: 'DURATION', align: 'right', read: ({ durationMs }) => durationLabel(durationMs), color: 'yellow' },
  { header: 'FILTER', align: 'left', read: ({ filter }) => filterLabel(filter) },
  { header: 'FETCHED', align: 'right', read: ({ entryCount }) => entryCount, color: 'dim' },
  { header: 'SHOWN', align: 'right', read: ({ shownCount }) => shownCount, color: 'yellow' }
]

const PANEL_COLUMNS = [
  { header: '', align: 'left', read: ({ label }) => label, color: 'bold' },
  { header: '', align: 'left', read: ({ value }) => value, color: ({ tone }) => tone }
]

const panelRowsOf = ({ id, fetchedAt, durationMs, filter, limit, entryCount, shownCount }) => [
  { label: 'RUN', value: String(id), tone: 'cyan' },
  { label: 'FETCHED AT', value: fetchedAt, tone: 'dim' },
  { label: 'DURATION', value: durationLabel(durationMs), tone: 'yellow' },
  { label: 'FILTER', value: filterLabel(filter), tone: 'cyan' },
  { label: 'LIMIT', value: limitLabel(limit), tone: 'cyan' },
  { label: 'FETCHED', value: entriesLabel(entryCount), tone: 'dim' },
  { label: 'SHOWN', value: entriesLabel(shownCount), tone: 'yellow' }
]

const summaryRowsOf = ({ id, filter, durationMs, entryCount, shownCount }) => [
  { label: 'RUN', value: String(id), tone: 'cyan' },
  { label: 'FILTER', value: filterLabel(filter), tone: 'cyan' },
  { label: 'DURATION', value: durationLabel(durationMs), tone: 'yellow' },
  { label: 'RESULTS', value: `${shownCount} of ${entryCount}`, tone: 'bold' }
]

const asPanel = ({ rows, palette, width }) =>
  renderTable({
    columns: PANEL_COLUMNS,
    rows,
    palette,
    width,
    padding: PANEL_PADDING,
    verticalPadding: PANEL_VERTICAL_PADDING,
    withHeader: false
  })

const asTable = ({ columns, rows, palette, width, emptyMessage }) =>
  rows.length === 0 ? emptyMessage : renderTable({ columns, rows, palette, width })

const asJson = (value) => JSON.stringify(value, null, 2)

export const formatEntries = ({ entries, format, palette, width }) =>
  format === 'json'
    ? asJson(entries)
    : asTable({
        columns: ENTRY_COLUMNS,
        rows: entries,
        palette,
        width,
        emptyMessage: 'No entries found'
      })

export const formatHistory = ({ runs, format, palette, width }) =>
  format === 'json'
    ? asJson(runs)
    : asTable({
        columns: RUN_COLUMNS,
        rows: runs,
        palette,
        width,
        emptyMessage: 'No stored runs found'
      })

export const formatRunStats = ({ stats, format, palette, width }) =>
  format === 'json' ? asJson(stats) : asPanel({ rows: panelRowsOf(stats), palette, width })

export const formatRunSummary = ({ stats, palette, width }) =>
  asPanel({ rows: summaryRowsOf(stats), palette, width })
