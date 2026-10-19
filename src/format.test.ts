import { expect, test } from 'bun:test'
import { formatCompactResource } from './format'

test('large stockpiles stay compact without losing small resource amounts', () => {
  expect(formatCompactResource(0.1)).toBe('0.1')
  expect(formatCompactResource(999)).toBe('999')
  expect(formatCompactResource(12345)).toBe('12.3K')
  expect(formatCompactResource(1234567)).toBe('1.2M')
  expect(formatCompactResource(Number.MAX_VALUE).length).toBeLessThan(12)
})
