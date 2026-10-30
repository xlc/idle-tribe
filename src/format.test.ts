import { expect, test } from 'bun:test'
import { formatDuration, formatResource } from './format'

test('formats values to two decimal places', () => {
  expect(formatResource(12.345)).toBe('12.35')
  expect(formatResource(0.125)).toBe('0.13')
})

test('keeps values below the two-decimal threshold at two significant figures', () => {
  expect(formatResource(0.0049)).toBe('0.0049')
  expect(formatResource(-0.0049)).toBe('-0.0049')
})

test('uses two decimals at the visibility threshold', () => {
  expect(formatResource(0.005)).toBe('0.01')
  expect(formatResource(0)).toBe('0')
})

test('keeps seconds and tenths in duration displays', () => {
  expect(formatDuration(12.34)).toBe('12.3s')
  expect(formatDuration(61.2)).toBe('1m 1.2s')
  expect(formatDuration(3661.2)).toBe('1h 1m 1.2s')
})

test('shows zero seconds when a duration reaches a larger unit', () => {
  expect(formatDuration(60)).toBe('1m 0s')
  expect(formatDuration(3600)).toBe('1h 0m 0s')
})
