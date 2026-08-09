import { describe, it, expect } from 'vitest'

import { countWords } from '../../src/domain/count-words.js'

describe('countWords', () => {
  describe('given a plain title', () => {
    it('counts every whitespace separated token', () => {
      expect(countWords('Show Hacker News A tiny static site generator')).toBe(8)
    })
  })

  describe('given a title with irregular whitespace', () => {
    it('ignores empty tokens produced by extra spaces', () => {
      expect(countWords('  JS   is    not    bad  ')).toBe(4)
    })
  })

  describe('given a title with punctuation attached to words', () => {
    it('keeps the punctuated token as a single word', () => {
      expect(countWords('Show Web: Ask me anything')).toBe(5)
    })
  })

  describe('given a title with a number standing on its own', () => {
    it('counts the number as a word', () => {
      expect(countWords('Product 17 released')).toBe(3)
    })
  })

  describe('given a title with standalone punctuation tokens', () => {
    it('does not count tokens without alphanumeric characters', () => {
      expect(countWords('wait for the - new changes')).toBe(5)
    })
  })

  describe('given a title with non latin characters', () => {
    it('counts them as words', () => {
      expect(countWords('Álgebra lineal 数学 explained')).toBe(4)
    })
  })

  describe('given an empty title', () => {
    it('counts no words', () => {
      expect(countWords('')).toBe(0)
    })
  })
})
