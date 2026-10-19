import styles from './styles-plugin'

await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [styles],
})
