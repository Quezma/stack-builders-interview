import { describe, it, expect } from 'vitest'

import { toRunOption, toLimitOption } from '../../src/adapters/cli-options.js'

describe('toRunOption', () => {
  describe('given a run identifier', () => {
    it('reads it as a number', () => {
      expect(toRunOption('3')).toBe(3)
    })
  })

  describe('given the last keyword', () => {
    it('keeps it as is', () => {
      expect(toRunOption('last')).toBe('last')
    })
  })

  describe('given a value that is not a run identifier', () => {
    it('rejects text', () => {
      expect(() => toRunOption('latest')).toThrow(/positive integer or "last"/)
    })

    it('rejects zero and negatives', () => {
      expect(() => toRunOption('0')).toThrow(/positive integer or "last"/)
      expect(() => toRunOption('-1')).toThrow(/positive integer or "last"/)
    })

    it('rejects decimals', () => {
      expect(() => toRunOption('2.5')).toThrow(/positive integer or "last"/)
    })

    it('rejects an empty value', () => {
      expect(() => toRunOption('')).toThrow(/positive integer or "last"/)
    })
  })
})

describe('toLimitOption', () => {
  describe('given an amount of entries', () => {
    it('reads it as a number', () => {
      expect(toLimitOption('10')).toBe(10)
    })
  })

  describe('given a value that is not an amount', () => {
    it('rejects text', () => {
      expect(() => toLimitOption('ten')).toThrow(/positive integer/)
    })

    it('rejects zero and negatives', () => {
      expect(() => toLimitOption('0')).toThrow(/positive integer/)
      expect(() => toLimitOption('-5')).toThrow(/positive integer/)
    })

    it('rejects decimals', () => {
      expect(() => toLimitOption('1.5')).toThrow(/positive integer/)
    })
  })
})
