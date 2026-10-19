import { describe, expect, test } from 'bun:test'
import { formatCompactResource, formatResourceRate } from './format'

describe('resource rate formatting', () => {
  test('preserves the sign and uses compact per-second values', () => {
    expect(formatResourceRate(5)).toBe('+5/s')
    expect(formatResourceRate(1 - 1 / 60)).toBe('+0.98/s')
    expect(formatResourceRate(-1 / 60)).toBe('-0.02/s')
    expect(formatResourceRate(-5)).toBe('-5/s')
    expect(formatResourceRate(0)).toBe('0/s')
    expect(formatResourceRate(-0)).toBe('0/s')
  })

  test('small food consumption never rounds down to zero', () => {
    expect(formatResourceRate(-0.1 / 60)).toBe('-0.0017/s')
    expect(formatResourceRate(0.001)).toBe('+0.001/s')
  })
})

test('large stockpiles stay compact without losing small resource amounts', () => {
  expect(formatCompactResource(0.1)).toBe('0.1')
  expect(formatCompactResource(999)).toBe('999')
  expect(formatCompactResource(12345)).toBe('12.3K')
  expect(formatCompactResource(1234567)).toBe('1.2M')
  expect(formatCompactResource(Number.MAX_VALUE).length).toBeLessThan(12)
})
