import http from 'node:http';
import {createDiagnosticsHandler} from './diagnostics.mjs';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const args=process.argv.slice(2),portIndex=args.indexOf('--port');
const port=Number(portIndex>=0?args.splice(portIndex,2)[1]:process.env.PORT||5173);
const root=resolve(args[0]||'.');
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const diagnostics=createDiagnosticsHandler(resolve('.diagnostics'),{enabled:args[0]===undefined});
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8' };
http.createServer(async (req, res) => {
  try {
    if(await diagnostics(req,res))return;
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Invalid path');
    if(path.split(sep).some(part=>part.startsWith('.'))||!['GET','HEAD'].includes(req.method))throw new Error('Private path');
    const file = path === root || path === resolve(root, 'assets') ? resolve(path, 'index.html') : path;
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Data Hungry → http://localhost:${port}`));
