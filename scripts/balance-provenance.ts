import { createHash } from 'node:crypto'

export async function provenance() {
  const files = [
    'package.json',
    'bun.lock',
    ...Array.from(new Bun.Glob('{src,scripts}/**/*.{ts,tsx}').scanSync('.')),
  ].sort()
  const hash = createHash('sha256')
  for (const file of files)
    hash
      .update(file)
      .update('\0')
      .update(await Bun.file(file).text())
      .update('\0')
  const revision = Bun.spawnSync(['git', 'rev-parse', 'HEAD'])
    .stdout.toString()
    .trim()
  return {
    revision,
    sourceHash: hash.digest('hex'),
    files,
    runtime: Bun.version,
  }
}
