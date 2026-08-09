const VERTICAL = '│'
const HORIZONTAL = '─'
const TRUNCATION_MARK = '…'
const MIN_FLEXIBLE_WIDTH = 10

const EDGES = {
  top: ['┌', '┬', '┐'],
  divider: ['├', '┼', '┤'],
  bottom: ['└', '┴', '┘']
}

const cellOf = (column, row) => String(column.read(row))

const naturalWidthOf = (column, rows) =>
  Math.max(column.header.length, ...rows.map((row) => cellOf(column, row).length))

const borderOverheadOf = (columns, padding) => columns.length * (padding * 2 + 1) + 1

const flexibleWidthOf = (widths, columns, index, width, padding) => {
  const takenByOthers = widths.reduce((total, own, at) => (at === index ? total : total + own), 0)
  const available = width - borderOverheadOf(columns, padding) - takenByOthers
  const natural = widths[index]

  return natural <= available ? natural : Math.max(MIN_FLEXIBLE_WIDTH, available)
}

const widthsFor = (columns, rows, width, padding) => {
  const natural = columns.map((column) => naturalWidthOf(column, rows))
  const flexibleIndex = columns.findIndex(({ flexible }) => flexible)

  if (flexibleIndex === -1) return natural

  return natural.with(flexibleIndex, flexibleWidthOf(natural, columns, flexibleIndex, width, padding))
}

const truncate = (text, width) =>
  text.length <= width ? text : `${text.slice(0, width - TRUNCATION_MARK.length)}${TRUNCATION_MARK}`

const fit = (text, width, alignment) =>
  alignment === 'right' ? truncate(text, width).padStart(width) : truncate(text, width).padEnd(width)

const leaveAsIs = (text) => text

const paintOf = (palette, color, row) => {
  const requested = typeof color === 'function' ? color(row) : color

  return requested ? palette[requested] : leaveAsIs
}

const borderLine = ([left, joint, right], widths, palette, padding) =>
  palette.dim(left + widths.map((width) => HORIZONTAL.repeat(width + padding * 2)).join(joint) + right)

const contentLine = (cells, palette, padding) => {
  const wall = palette.dim(VERTICAL)
  const gap = ' '.repeat(padding)

  return `${wall}${gap}${cells.join(`${gap}${wall}${gap}`)}${gap}${wall}`
}

const blankLine = (widths, palette, padding) =>
  contentLine(
    widths.map((width) => ' '.repeat(width)),
    palette,
    padding
  )

const headerLine = (columns, widths, palette, padding) =>
  contentLine(
    columns.map(({ header }, index) => palette.bold(fit(header, widths[index], 'left'))),
    palette,
    padding
  )

const rowLine = (columns, widths, palette, padding, row) =>
  contentLine(
    columns.map((column, index) =>
      paintOf(palette, column.color, row)(fit(cellOf(column, row), widths[index], column.align))
    ),
    palette,
    padding
  )

export const renderTable = ({
  columns,
  rows,
  palette,
  width = Number.POSITIVE_INFINITY,
  padding = 1,
  verticalPadding = 0,
  withHeader = true
}) => {
  const widths = widthsFor(columns, rows, width, padding)

  const heading = withHeader
    ? [headerLine(columns, widths, palette, padding), borderLine(EDGES.divider, widths, palette, padding)]
    : []

  const gap = Array.from({ length: verticalPadding }, () => blankLine(widths, palette, padding))

  return [
    borderLine(EDGES.top, widths, palette, padding),
    ...heading,
    ...gap,
    ...rows.map((row) => rowLine(columns, widths, palette, padding, row)),
    ...gap,
    borderLine(EDGES.bottom, widths, palette, padding)
  ].join('\n')
}
