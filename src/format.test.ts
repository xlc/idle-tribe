import { expect, test } from 'bun:test'
import { formatResource } from './format'

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
