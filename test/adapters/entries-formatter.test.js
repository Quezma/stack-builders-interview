import { describe, it, expect } from 'vitest'

import {
  formatEntries,
  formatHistory,
  formatRunStats,
  formatRunSummary
} from '../../src/adapters/entries-formatter.js'
import { createPalette } from '../../src/adapters/ansi.js'

const stripAnsi = (text) => text.replaceAll(/\u001b\[\d+m/g, '')

const plain = () => createPalette(false)

const entries = [
  { rank: 1, title: 'My server is a phone now', points: 196, comments: 80 },
  { rank: 2, title: 'Short title', points: 12, comments: 3 }
]

const runs = [
  {
    id: 1,
    fetchedAt: '2026-08-09T06:12:00.000Z',
    durationMs: 412,
    filter: 'long-titles',
    limit: 5,
    entryCount: 30,
    shownCount: 5
  },
  {
    id: 2,
    fetchedAt: '2026-08-09T07:40:00.000Z',
    durationMs: null,
    filter: null,
    limit: null,
    entryCount: 30,
    shownCount: 30
  }
]

describe('formatEntries', () => {
  describe('given the table format', () => {
    it('renders the entries in a bordered table', () => {
      expect(formatEntries({ entries, format: 'table', palette: plain() })).toBe([
          '┌──────┬────────┬──────────┬──────────────────────────┐',
          '│ RANK │ POINTS │ COMMENTS │ TITLE                    │',
          '├──────┼────────┼──────────┼──────────────────────────┤',
          '│    1 │    196 │       80 │ My server is a phone now │',
          '│    2 │     12 │        3 │ Short title              │',
          '└──────┴────────┴──────────┴──────────────────────────┘'
        ].join('\n'))
    })

    it('fits the table in the available width', () => {
      const rendered = formatEntries({ entries, format: 'table', palette: plain(), width: 45 })

      expect(rendered.split('\n').every(({ length }) => length === 45)).toBe(true)
    })

    it('keeps the layout intact when colors are enabled', () => {
      const colored = formatEntries({ entries, format: 'table', palette: createPalette(true) })

      expect(stripAnsi(colored)).toBe(formatEntries({ entries, format: 'table', palette: plain() }))
    })

    it('gives each column the color of what it holds', () => {
      const palette = createPalette(true)
      const colored = formatEntries({ entries, format: 'table', palette })

      expect(colored).toContain(palette.dim('1'.padStart(4)))
      expect(colored).toContain(palette.yellow('196'.padStart(6)))
      expect(colored).toContain(palette.cyan('80'.padStart(8)))
    })

    describe('and there are no entries', () => {
      it('says so instead of rendering an empty table', () => {
        expect(formatEntries({ entries: [], format: 'table', palette: plain() })).toBe('No entries found')
      })
    })
  })

  describe('given the json format', () => {
    it('renders the entries as indented json', () => {
      expect(JSON.parse(formatEntries({ entries, format: 'json', palette: plain() }))).toStrictEqual(entries)
    })

    it('never colors the output', () => {
      const rendered = formatEntries({ entries, format: 'json', palette: createPalette(true) })

      expect(stripAnsi(rendered)).toBe(rendered)
    })

    describe('and there are no entries', () => {
      it('renders an empty json list', () => {
        expect(JSON.parse(formatEntries({ entries: [], format: 'json', palette: plain() }))).toStrictEqual([])
      })
    })
  })
})

describe('formatHistory', () => {
  const historyRow = (cells) => `│ ${cells.join(' │ ')} │`

  describe('given the table format', () => {
    const lines = () => formatHistory({ runs, format: 'table', palette: plain() }).split('\n')

    it('names one column per statistic', () => {
      expect(lines()[1]).toBe(historyRow([
          'RUN',
          'FETCHED AT'.padEnd(19),
          'DURATION',
          'FILTER'.padEnd(11),
          'FETCHED',
          'SHOWN'
        ]))
    })

    it('renders one row per run, with a readable timestamp', () => {
      expect(lines()[3]).toBe(historyRow([
          '1'.padStart(3),
          '2026-08-09 06:12:00',
          '412 ms'.padStart(8),
          'long-titles',
          '30'.padStart(7),
          '5'.padStart(5)
        ]))
    })

    it('renders the statistics an older run never recorded', () => {
      expect(lines()[4]).toBe(historyRow([
          '2'.padStart(3),
          '2026-08-09 07:40:00',
          'unknown'.padStart(8),
          'none'.padEnd(11),
          '30'.padStart(7),
          '30'.padStart(5)
        ]))
    })

    it('gives each column the color of what it holds', () => {
      const palette = createPalette(true)
      const colored = formatHistory({ runs, format: 'table', palette })

      expect(colored).toContain(palette.cyan('1'.padStart(3)))
      expect(colored).toContain(palette.dim('2026-08-09 06:12:00'))
      expect(colored).toContain(palette.yellow('412 ms'.padStart(8)))
      expect(colored).toContain(palette.dim('30'.padStart(7)))
      expect(colored).toContain(palette.yellow('5'.padStart(5)))
    })

    describe('and there are no runs', () => {
      it('says so instead of rendering an empty table', () => {
        expect(formatHistory({ runs: [], format: 'table', palette: plain() })).toBe('No stored runs found')
      })
    })
  })

  describe('given the json format', () => {
    it('renders the runs as indented json', () => {
      expect(JSON.parse(formatHistory({ runs, format: 'json', palette: plain() }))).toStrictEqual(runs)
    })
  })
})

describe('formatRunStats', () => {
  const panelLine = (label, value) => `│  ${label.padEnd(10)}  │  ${value.padEnd(24)}  │`
  const panelBlank = `│${' '.repeat(14)}│${' '.repeat(28)}│`

  describe('given the table format', () => {
    it('renders the statistics as a labelled panel', () => {
      expect(formatRunStats({ stats: runs[0], format: 'table', palette: plain() })).toBe([
          `┌${'─'.repeat(14)}┬${'─'.repeat(28)}┐`,
          panelBlank,
          panelLine('RUN', '1'),
          panelLine('FETCHED AT', '2026-08-09T06:12:00.000Z'),
          panelLine('DURATION', '412 ms'),
          panelLine('FILTER', 'long-titles'),
          panelLine('LIMIT', '5'),
          panelLine('FETCHED', '30 entries'),
          panelLine('SHOWN', '5 entries'),
          panelBlank,
          `└${'─'.repeat(14)}┴${'─'.repeat(28)}┘`
        ].join('\n'))
    })

    it('renders the statistics an older run never recorded', () => {
      const rendered = formatRunStats({ stats: runs[1], format: 'table', palette: plain() })

      expect(rendered).toContain(panelLine('DURATION', 'unknown'))
      expect(rendered).toContain(panelLine('FILTER', 'none'))
      expect(rendered).toContain(panelLine('LIMIT', 'none'))
    })

    it('keeps the layout intact when colors are enabled', () => {
      const colored = formatRunStats({ stats: runs[0], format: 'table', palette: createPalette(true) })

      expect(stripAnsi(colored)).toBe(formatRunStats({ stats: runs[0], format: 'table', palette: plain() }))
    })

    it('gives each value the color of what it means', () => {
      const palette = createPalette(true)
      const colored = formatRunStats({ stats: runs[0], format: 'table', palette })

      expect(colored).toContain(palette.bold('RUN'.padEnd(10)))
      expect(colored).toContain(palette.cyan('1'.padEnd(24)))
      expect(colored).toContain(palette.dim('2026-08-09T06:12:00.000Z'))
      expect(colored).toContain(palette.yellow('412 ms'.padEnd(24)))
      expect(colored).toContain(palette.cyan('long-titles'.padEnd(24)))
      expect(colored).toContain(palette.cyan('5'.padEnd(24)))
      expect(colored).toContain(palette.dim('30 entries'.padEnd(24)))
      expect(colored).toContain(palette.yellow('5 entries'.padEnd(24)))
    })
  })

  describe('given the json format', () => {
    it('renders the statistics as indented json', () => {
      const rendered = formatRunStats({ stats: runs[0], format: 'json', palette: plain() })

      expect(JSON.parse(rendered)).toStrictEqual(runs[0])
    })
  })
})

describe('formatRunSummary', () => {
  const summaryLine = (label, value) => `│  ${label.padEnd(8)}  │  ${value.padEnd(11)}  │`
  const summaryBlank = `│${' '.repeat(12)}│${' '.repeat(15)}│`

  it('summarises what the run did above the entries', () => {
    expect(formatRunSummary({ stats: runs[0], palette: plain() })).toBe([
        `┌${'─'.repeat(12)}┬${'─'.repeat(15)}┐`,
        summaryBlank,
        summaryLine('RUN', '1'),
        summaryLine('FILTER', 'long-titles'),
        summaryLine('DURATION', '412 ms'),
        summaryLine('RESULTS', '5 of 30'),
        summaryBlank,
        `└${'─'.repeat(12)}┴${'─'.repeat(15)}┘`
      ].join('\n'))
  })

  it('summarises a run that recorded no statistics', () => {
    const rendered = formatRunSummary({ stats: runs[1], palette: plain() })

    expect(rendered).toContain('unknown')
    expect(rendered).toContain('none')
    expect(rendered).toContain('30 of 30')
  })

  it('keeps the layout intact when colors are enabled', () => {
    const colored = formatRunSummary({ stats: runs[0], palette: createPalette(true) })

    expect(stripAnsi(colored)).toBe(formatRunSummary({ stats: runs[0], palette: plain() }))
  })

  it('gives each value the color of what it means', () => {
    const palette = createPalette(true)
    const colored = formatRunSummary({ stats: runs[0], palette })

    expect(colored).toContain(palette.bold('FILTER'.padEnd(8)))
    expect(colored).toContain(palette.cyan('1'.padEnd(11)))
    expect(colored).toContain(palette.cyan('long-titles'.padEnd(11)))
    expect(colored).toContain(palette.yellow('412 ms'.padEnd(11)))
    expect(colored).toContain(palette.bold('5 of 30'.padEnd(11)))
  })
})
