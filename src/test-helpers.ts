export function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined)
    throw new Error(`Missing fixture item at index ${index}`)
  return item
}
