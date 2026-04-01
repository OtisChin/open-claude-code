const result = await Bun.build({
  entrypoints: ['./src/entrypoints/cli.tsx'],
  outdir: './dist-tmp',
  target: 'bun',
  format: 'esm',
  define: { 'MACRO.VERSION': JSON.stringify('0.0.0-snapshot') },
  loader: { '.md': 'text', '.txt': 'text' },
})
console.log(JSON.stringify({ success: result.success, outputs: result.outputs.length, logs: result.logs.length }))
if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}
