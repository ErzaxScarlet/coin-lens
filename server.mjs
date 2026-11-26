import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {investigate,similarity,isAddress} from './research.mjs';
const dir=new URL('./data/',import.meta.url), file=new URL('cases.json',dir);
let cases=[];
try {cases=JSON.parse(await readFile(file,'utf8'));} catch(e){if(e.code!=='ENOENT')throw e;}
let writes=Promise.resolve();
const active=new Map();
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'");
  try {
    const u=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&files[u.pathname]){const [name,type]=files[u.pathname];res.writeHead(200,{'Content-Type':type});return res.end(await readFile(new URL('./public/'+name,import.meta.url)));}
    if(req.method==='GET'&&u.pathname==='/api/cases')return send(res,200,cases);
    if(req.method==='GET'&&u.pathname==='/api/similarity')return send(res,200,await similarity(u.searchParams.get('q')));
    if(req.method==='POST'&&u.pathname==='/api/cases'){
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048)return send(res,413,{error:'Request too large.'});}
      let mint;try{({mint}=JSON.parse(raw));}catch{return send(res,400,{error:'Invalid JSON.'});}
      if(!isAddress(mint))return send(res,400,{error:'Enter a valid Solana mint address.'});
      const cached=cases.find(c=>c.mint===mint&&Date.now()-Date.parse(c.time)<300000);
      if(cached)return send(res,200,cached);
      if(active.size>=4&&!active.has(mint))return send(res,429,{error:'Research queue is busy. Try again shortly.'});
      if(!active.has(mint)){
        active.set(mint,(async()=>{const report={id:randomUUID(),...await investigate(mint)};cases=[report,...cases].slice(0,200);const snapshot=JSON.stringify(cases,null,2);writes=writes.catch(()=>{}).then(async()=>{await mkdir(dir,{recursive:true});const tmp=new URL('cases.tmp',dir);await writeFile(tmp,snapshot);await rename(tmp,file);});await writes;return report;})().finally(()=>active.delete(mint)));
      }
      return send(res,200,await active.get(mint));
    }
    send(res,404,{error:'Not found.'});
  } catch(e){send(res,502,{error:'Research provider unavailable. Please try again later.'});}
});
server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('CoinLens: http://localhost:'+server.address().port));
