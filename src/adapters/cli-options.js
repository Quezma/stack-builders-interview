import { InvalidArgumentError } from 'commander'

const LAST_RUN = 'last'

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0

const toPositiveInteger = (value, complaint) => {
  const parsed = Number(value)

  if (!isPositiveInteger(parsed)) throw new InvalidArgumentError(complaint)

  return parsed
}

export const toRunOption = (value) =>
  value === LAST_RUN
    ? LAST_RUN
    : toPositiveInteger(value, 'Run must be a positive integer or "last"')

export const toLimitOption = (value) =>
  toPositiveInteger(value, 'Limit must be a positive integer')
