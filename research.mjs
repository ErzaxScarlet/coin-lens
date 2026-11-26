export const isAddress = s => typeof s === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const dex = 'https://api.dexscreener.com';
const rpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
async function json(url, opts = {}) {
  const response = await fetch(url, {...opts, signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('Provider HTTP ' + response.status);
  return response.json();
}
async function chain(method, params) {
  const r = await json(rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if (r.error) throw Error('RPC unavailable');
  return r.result?.value;
}
export function bestPair(pairs, mint) {
  return (Array.isArray(pairs)?pairs:[]).filter(p=>p.chainId==='solana'&&p.baseToken?.address===mint).sort((a,b)=>(b.liquidity?.usd??0)-(a.liquidity?.usd??0))[0]??null;
}
export function concentration(accounts,supply) {
  if (!Array.isArray(accounts)||!supply?.amount||BigInt(supply.amount)<=0n) return null;
  return accounts.map(a=>({address:a.address,percent:Number(BigInt(a.amount)*10000n/BigInt(supply.amount))/100}));
}
export async function investigate(mint) {
  if (!isAddress(mint)) throw Error('Enter a valid Solana token address.');
  const [market, info, largest, supply] = await Promise.allSettled([
    json(dex+'/token-pairs/v1/solana/'+mint),
    chain('getAccountInfo',[mint,{encoding:'jsonParsed',commitment:'confirmed'}]),
    chain('getTokenLargestAccounts',[mint,{commitment:'confirmed'}]),
    chain('getTokenSupply',[mint,{commitment:'confirmed'}])
  ]);
  const pair=market.status==='fulfilled'?bestPair(market.value,mint):null;
  const parsed=info.status==='fulfilled'&&info.value?.data?.parsed?.type==='mint'?info.value.data.parsed.info:null;
  const holders=largest.status==='fulfilled'&&supply.status==='fulfilled'?concentration(largest.value,supply.value):null;
  const evidence=[];
  const add=(title,status,detail,source)=>evidence.push({title,status,detail,source});
  const explorer='https://solscan.io/token/'+mint;
  for (const [key,label] of [['mintAuthority','Mint authority'],['freezeAuthority','Freeze authority']]) {
    const known=parsed&&Object.hasOwn(parsed,key);
    add(label,known?(parsed[key]===null?'positive':'risk'):'unknown',known?(parsed[key]===null?'Revoked.':'Authority remains active: '+parsed[key]):'Mint data was not available.',explorer);
  }
  add('Market listing',pair?'observed':'unknown',pair?'Reported on '+pair.dexId+'; market data alone does not establish legitimacy.':'No indexed base-token pool was returned.', 'https://dexscreener.com/solana/'+mint);
  add('Holder concentration',holders?'observed':'unknown',holders?'Top 10 token accounts hold '+holders.slice(0,10).reduce((a,h)=>a+h.percent,0).toFixed(2)+'% of supply; accounts may include pools, locks and other program-owned accounts.':'Provider did not return account distribution. A dedicated RPC may be needed.',explorer);
  return {mint,time:new Date().toISOString(),name:pair?.baseToken?.name??'Unknown token',symbol:pair?.baseToken?.symbol??mint.slice(0,6),market:pair?{price:pair.priceUsd,cap:pair.marketCap??null,fdv:pair.fdv??null,liquidity:pair.liquidity?.usd??null,volume:pair.volume?.h24??null,change:pair.priceChange?.h24??null,buys:pair.txns?.h24?.buys??null,sells:pair.txns?.h24?.sells??null,dex:pair.dexId,pairCreatedAt:pair.pairCreatedAt??null}:null,holders,evidence,status:parsed||pair?'Research available':'Unresolved',note:'Public-data snapshot. Project claims and safety have not been verified.'};
}
export async function similarity(query) {
  if(typeof query!=='string'||!query.trim()||query.length>100) throw Error('Enter a token name or ticker.');
  const data=await json(dex+'/latest/dex/search?q='+encodeURIComponent(query.trim()));
  const seen=new Set();
  return (data.pairs??[]).filter(p=>p.chainId==='solana'&&p.baseToken?.address&&!seen.has(p.baseToken.address)&&seen.add(p.baseToken.address)).map(p=>({mint:p.baseToken.address,name:p.baseToken.name,symbol:p.baseToken.symbol,cap:p.marketCap??null,pairCreatedAt:p.pairCreatedAt??null}));
}
