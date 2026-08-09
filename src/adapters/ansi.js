const CODES = {
  bold: 1,
  dim: 2,
  red: 31,
  yellow: 33,
  cyan: 36
}

const paintWith = (code) => (text) => `\u001b[${code}m${text}\u001b[0m`

const leaveAsIs = (text) => text

export const createPalette = (enabled) =>
  Object.fromEntries(
    Object.entries(CODES).map(([name, code]) => [name, enabled ? paintWith(code) : leaveAsIs])
  )

export const colorsSupported = ({ isTTY, env }) =>
  Boolean(isTTY) && !env.NO_COLOR && env.TERM !== 'dumb'
