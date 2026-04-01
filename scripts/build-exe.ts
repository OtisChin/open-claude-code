const result = await Bun.build({
  entrypoints: ['./src/entrypoints/cli.tsx'],
  outfile: './dist/OpenClaudeCode.exe',
  target: 'bun',
  compile: true,
  define: {
    'MACRO.VERSION': JSON.stringify('0.0.0-snapshot'),
  },
  loader: {
    '.md': 'text',
    '.txt': 'text',
  },
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

for (const output of result.outputs) {
  console.log(output.path);
}
