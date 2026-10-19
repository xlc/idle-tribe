// Each key is populated before the record escapes. Object.fromEntries cannot
// express that relationship, so keep the assertion at this construction boundary.
export function createRecord<K extends string, V>(
  keys: readonly K[],
  value: (key: K) => V,
): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<
    K,
    V
  >
}
