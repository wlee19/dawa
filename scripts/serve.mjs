// Zero-dependency static server for local development: `npm start`, then open http://localhost:8080
// Web NFC and the camera need HTTPS on a phone; use the Vercel preview (or a tunnel) to test those.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../public/',import.meta.url));
const port=Number(process.env.PORT)||8080;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.wav':'audio/wav','.wasm':'application/wasm','.gz':'application/gzip','.svg':'image/svg+xml'};

createServer(async(req,res)=>{
 const path=normalize(decodeURIComponent(new URL(req.url,'http://x').pathname)).replace(/^(\.\.[/\\])+/,'');
 let file=join(root,path);
 try{if((await stat(file)).isDirectory())file=join(file,'index.html');
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(port,()=>console.log(`dawa running at http://localhost:${port}`));
