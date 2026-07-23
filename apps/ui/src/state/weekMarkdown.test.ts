import { describe, expect, it } from 'vitest'

import { makeWeek } from '@/test/weekFixture'

import { weekToMarkdown } from './weekMarkdown'

describe('weekToMarkdown', () => {
  it('formats the week, days, notes, and prescribed exercises', () => {
    expect(weekToMarkdown(makeWeek())).toBe(
      [
        '# Week 4',
        '══════════\nMONDAY — Day 1 · upper body\n══════════\nBench Press — 2x8 — 30 kg',
        '══════════\nTUESDAY — Day 2 · rest\n══════════\nWalk and recover.',
      ].join('\n\n'),
    )
  })
})
