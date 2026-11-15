// Gera public/index.html (site publicado com Supabase) e dist/index.html (versão do Claude).
// Uso: npm run build     (precisa de: npm install)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(raiz, 'supabase.config.json'), 'utf8'));

const r = await build({
  entryPoints: [join(raiz, 'src/app.jsx')], bundle: true, minify: true, format: 'iife', write: false,
  loader: { '.png': 'dataurl', '.jpg': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' },
  jsx: 'automatic', target: 'es2020', logLevel: 'warning', nodePaths: process.env.NODE_PATH ? [process.env.NODE_PATH] : [],
});
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = readFileSync(join(raiz, 'src/style.css'), 'utf8');

const pagina = (titulo, extra) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<meta name="description" content="A Contratei conecta empresas e profissionais de vendas por compatibilidade, não por sorte.">
<meta name="theme-color" content="#0A0A0A">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<style>${css}</style>
${extra}
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>`;

const conf = `<script>window.CONTRATEI_SUPABASE = ${JSON.stringify({ url: cfg.url, key: cfg.publishableKey })};</script>`;
for (const [arq, html] of [['public/index.html', pagina('Contratei · Conexão por compatibilidade', conf)], ['dist/index.html', pagina('Contratei · MVP', '')]]) {
  mkdirSync(join(raiz, dirname(arq)), { recursive: true });
  writeFileSync(join(raiz, arq), html);
  console.log(arq, Math.round(html.length / 1024), 'KB');
}
