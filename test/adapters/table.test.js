import { describe, it, expect } from 'vitest'

import { renderTable } from '../../src/adapters/table.js'
import { createPalette } from '../../src/adapters/ansi.js'

const stripAnsi = (text) => text.replaceAll(/\u001b\[\d+m/g, '')

const COLUMNS = [
  { header: 'RANK', align: 'right', read: ({ rank }) => rank, color: 'dim' },
  { header: 'TITLE', align: 'left', read: ({ title }) => title, flexible: true }
]

const rows = [
  { rank: 1, title: 'My server is a phone now' },
  { rank: 2, title: 'Short title' }
]

describe('renderTable', () => {
  describe('given columns and rows', () => {
    const render = () => renderTable({ columns: COLUMNS, rows, palette: createPalette(false) })

    it('draws a bordered table with one line per row', () => {
      expect(render()).toBe([
          '┌──────┬──────────────────────────┐',
          '│ RANK │ TITLE                    │',
          '├──────┼──────────────────────────┤',
          '│    1 │ My server is a phone now │',
          '│    2 │ Short title              │',
          '└──────┴──────────────────────────┘'
        ].join('\n'))
    })

    it('draws every line with the same width', () => {
      const lengths = render()
        .split('\n')
        .map(({ length }) => length)

      expect(new Set(lengths).size).toBe(1)
    })
  })

  describe('given a width the table does not fit in', () => {
    it('shrinks the flexible column so the table fits', () => {
      const rendered = renderTable({
        columns: COLUMNS,
        rows,
        palette: createPalette(false),
        width: 30
      })

      const lengths = rendered.split('\n').map(({ length }) => length)

      expect(lengths).toStrictEqual(Array.from({ length: 6 }, () => 30))
    })

    it('marks the shrunk values as truncated', () => {
      const rendered = renderTable({
        columns: COLUMNS,
        rows,
        palette: createPalette(false),
        width: 30
      })

      expect(rendered).toContain('My server is a pho…')
    })

    it('never shrinks the flexible column below a readable width', () => {
      const rendered = renderTable({
        columns: COLUMNS,
        rows,
        palette: createPalette(false),
        width: 5
      })

      expect(rendered.split('\n').every(({ length }) => length > 5)).toBe(true)
    })
  })

  describe('given colors are enabled', () => {
    it('renders the very same layout once the escape codes are removed', () => {
      const plain = renderTable({ columns: COLUMNS, rows, palette: createPalette(false) })
      const colored = renderTable({ columns: COLUMNS, rows, palette: createPalette(true) })

      expect(colored).not.toBe(plain)
      expect(stripAnsi(colored)).toBe(plain)
    })
  })

  describe('given no rows', () => {
    it('draws the header alone', () => {
      const rendered = renderTable({ columns: COLUMNS, rows: [], palette: createPalette(false) })

      expect(rendered).toBe(
        ['┌──────┬───────┐', '│ RANK │ TITLE │', '├──────┼───────┤', '└──────┴───────┘'].join('\n')
      )
    })
  })
})

describe('renderTable without a header', () => {
  const PANEL_COLUMNS = [
    { header: '', align: 'left', read: ({ label }) => label, color: 'bold' },
    { header: '', align: 'left', read: ({ value }) => value, color: ({ tone }) => tone }
  ]

  const panelRows = [
    { label: 'RUN', value: '7', tone: 'cyan' },
    { label: 'DURATION', value: '412 ms', tone: 'yellow' }
  ]

  const panel = (options) =>
    renderTable({ columns: PANEL_COLUMNS, rows: panelRows, withHeader: false, ...options })

  describe('given the header is turned off', () => {
    it('draws the rows alone inside the box', () => {
      expect(panel({ palette: createPalette(false) })).toBe([
          '┌──────────┬────────┐',
          '│ RUN      │ 7      │',
          '│ DURATION │ 412 ms │',
          '└──────────┴────────┘'
        ].join('\n'))
    })
  })

  describe('given extra padding', () => {
    it('widens every cell on both sides', () => {
      expect(panel({ palette: createPalette(false), padding: 2 })).toBe([
          '┌────────────┬──────────┐',
          '│  RUN       │  7       │',
          '│  DURATION  │  412 ms  │',
          '└────────────┴──────────┘'
        ].join('\n'))
    })
  })

  describe('given vertical padding', () => {
    it('opens the box with a blank line and closes it with another', () => {
      expect(panel({ palette: createPalette(false), verticalPadding: 1 })).toBe([
          '┌──────────┬────────┐',
          `│${' '.repeat(10)}│${' '.repeat(8)}│`,
          '│ RUN      │ 7      │',
          '│ DURATION │ 412 ms │',
          `│${' '.repeat(10)}│${' '.repeat(8)}│`,
          '└──────────┴────────┘'
        ].join('\n'))
    })

    it('leaves the box tight when no vertical padding is asked for', () => {
      expect(panel({ palette: createPalette(false) }).split('\n')).toHaveLength(4)
    })
  })

  describe('given a column whose color depends on the row', () => {
    it('paints each row with the color that row asks for', () => {
      const palette = createPalette(true)
      const colored = panel({ palette })

      expect(colored).toContain(palette.cyan('7'.padEnd(6)))
      expect(colored).toContain(palette.yellow('412 ms'))
    })

    it('keeps the layout intact', () => {
      const colored = panel({ palette: createPalette(true) })

      expect(stripAnsi(colored)).toBe(panel({ palette: createPalette(false) }))
    })
  })
})
