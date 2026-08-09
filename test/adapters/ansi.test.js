import { describe, it, expect } from 'vitest'

import { createPalette, colorsSupported } from '../../src/adapters/ansi.js'

describe('createPalette', () => {
  describe('given colors are enabled', () => {
    it('wraps the text in the escape codes of the requested color', () => {
      const palette = createPalette(true)

      expect(palette.bold('hi')).toBe('\u001b[1mhi\u001b[0m')
      expect(palette.dim('hi')).toBe('\u001b[2mhi\u001b[0m')
      expect(palette.yellow('hi')).toBe('\u001b[33mhi\u001b[0m')
      expect(palette.cyan('hi')).toBe('\u001b[36mhi\u001b[0m')
      expect(palette.red('hi')).toBe('\u001b[31mhi\u001b[0m')
    })
  })

  describe('given colors are disabled', () => {
    it('returns the text untouched', () => {
      const palette = createPalette(false)

      expect(palette.bold('hi')).toBe('hi')
      expect(palette.dim('hi')).toBe('hi')
      expect(palette.yellow('hi')).toBe('hi')
      expect(palette.cyan('hi')).toBe('hi')
      expect(palette.red('hi')).toBe('hi')
    })
  })
})

describe('colorsSupported', () => {
  describe('given an interactive terminal', () => {
    it('supports colors', () => {
      expect(colorsSupported({ isTTY: true, env: {} })).toBe(true)
    })
  })

  describe('given the output is not a terminal', () => {
    it('does not support colors', () => {
      expect(colorsSupported({ isTTY: false, env: {} })).toBe(false)
      expect(colorsSupported({ isTTY: undefined, env: {} })).toBe(false)
    })
  })

  describe('given NO_COLOR is set', () => {
    it('does not support colors', () => {
      expect(colorsSupported({ isTTY: true, env: { NO_COLOR: '1' } })).toBe(false)
    })

    it('ignores it when it is empty', () => {
      expect(colorsSupported({ isTTY: true, env: { NO_COLOR: '' } })).toBe(true)
    })
  })

  describe('given a terminal that cannot render escape codes', () => {
    it('does not support colors', () => {
      expect(colorsSupported({ isTTY: true, env: { TERM: 'dumb' } })).toBe(false)
    })
  })
})
