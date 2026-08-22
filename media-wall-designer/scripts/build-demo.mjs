/**
 * Bundles the demo build into one self-contained HTML file.
 *
 * Output has no <html>/<head>/<body> wrapper so it can be published straight to
 * a host that supplies its own document skeleton, and no external requests
 * except the Google Fonts stylesheet the app already uses.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist-demo';
const css = readFileSync(join(dist, 'app.css'), 'utf8');
const js = readFileSync(join(dist, 'app.js'), 'utf8');

// A literal </script> inside the bundle would close the tag early.
const safeJs = js.replace(/<\/script>/gi, '<\\/script>');

const html = `<title>Media Wall Designer</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;

mkdirSync('demo', { recursive: true });
const out = join('demo', 'media-wall-designer.html');
writeFileSync(out, html);
console.log(`${out} — ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
