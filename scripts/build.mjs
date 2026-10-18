import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { validateContent } from '../src/content.js';
const content=validateContent(JSON.parse(await readFile('content/local-manifest.json','utf8')));
await writeFile('src/starter-content.js', '// Generated from content/local-manifest.json by scripts/build.mjs.\nexport default '+JSON.stringify(content,null,2)+';\n');
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'preview.html', 'src', 'vendor', 'content', 'assets']) await cp(file, `dist/${file}`, { recursive: true });
console.log('Built self-contained web app in dist/ (Three.js r180 bundled locally).');
