import {normalizeResult,normalizeTerritory,STATES,OFFICE_LABELS,type RawRecord,type ElectionResult,type Overview} from "./election-model";
import localities from "./election-geography.json";

const BASE="https://resultados.tse.jus.br/oficial";
type CacheEntry={value?:RawRecord;error?:string;expires:number};
const cache=new Map<string,CacheEntry>();
const inFlight=new Map<string,Promise<RawRecord>>();
let blockedUntil=0;

export async function officialJSON(url:string,ttl=20000):Promise<RawRecord>{
  const cached=cache.get(url);
  if(cached&&cached.expires>Date.now()){if(cached.error)throw new Error(cached.error);return cached.value!;}
  if(blockedUntil>Date.now())throw new Error("O TSE limitou as consultas. Uma nova tentativa será feita automaticamente.");
  if(inFlight.has(url))return inFlight.get(url)!;
  const pending=(async()=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});
      if(!response.ok){
        if(response.status===403||response.status===429)blockedUntil=Date.now()+610000;
        const msg=response.status===404?"O TSE ainda não disponibilizou este arquivo.":`Fonte oficial indisponível (${response.status}).`;
        cache.set(url,{error:msg,expires:Date.now()+(response.status===404?60000:30000)});throw new Error(msg);
      }
      const data:RawRecord=await response.json();
      if(data.f!=="o")throw new Error("O arquivo não pertence à apuração oficial.");
      if(cache.size>300)cache.delete(cache.keys().next().value!);
      cache.set(url,{value:data,expires:Date.now()+ttl});return data;
    }finally{clearTimeout(timer);}
  })();
  inFlight.set(url,pending);
  try{return await pending;}finally{inFlight.delete(url);}
}
async function electionFor(office:string){
  const config=await officialJSON(`${BASE}/comum/config/ele-c.json`,300000);
  const pleito=config.pl?.find((p:RawRecord)=>p.c==="ele2026"&&p.dt==="04/10/2026");
  const election=pleito?.e?.find((e:RawRecord)=>e.t==="1"&&e.abr?.some((a:RawRecord)=>a.cp?.some((c:RawRecord)=>String(c.cd)===office)));
  if(!election)throw new Error("A eleição solicitada não está disponível na configuração oficial.");
  return {id:String(election.cd),cycle:String(pleito.c)};
}
export async function loadResult(office:string,uf:string,city?:string):Promise<ElectionResult>{
  if(!OFFICE_LABELS[office])throw new Error("Cargo inválido");
  if(!(uf in STATES)&&uf!=="br"&&uf!=="zz")throw new Error("Abrangência inválida");
  if(uf==="zz"&&office!=="1")throw new Error("No exterior, a eleição é para presidente.");
  if(city&&!localities.cities.some(c=>c.code===city))throw new Error("Localidade inválida");
  const {id,cycle}=await electionFor(office);
  const url=`${BASE}/${cycle}/${id}/dados/${uf}/${uf}${city??""}-c${office.padStart(4,"0")}-e${id.padStart(6,"0")}-u.json`;
  const data=await officialJSON(url);
  if(String(data.ele)!==id||String(data.t)!=="1")throw new Error("O arquivo recebido é de outra eleição.");
  if(String(data.cdabr)!==(city??uf))throw new Error("O arquivo recebido é de outra abrangência.");
  return normalizeResult(data,url,office);
}
export async function loadMany(office:string,areas:{uf:string;city?:string}[]){
  const results:ElectionResult[]=[];const missing:string[]=[];let next=0;
  await Promise.all(Array.from({length:Math.min(6,areas.length)},async()=>{
    while(next<areas.length){const area=areas[next++];try{results.push(await loadResult(office,area.uf,area.city));}catch{missing.push(area.city??area.uf);}}
  }));
  return {results,missing};
}
export async function loadOverview(office="1"):Promise<Overview>{
  const checkedAt=new Date().toISOString();const {id,cycle}=await electionFor(office);
  const urls=[`${BASE}/${cycle}/${id}/dados/br/br-e${id.padStart(6,"0")}-ab.json`,`${BASE}/ele2026/6257/dados/zz/zz-e006257-ab.json`];
  const files=await Promise.allSettled(urls.map(url=>officialJSON(url)));
  const states:Overview["states"]=[],cities:Overview["cities"]=[],generatedAt:string[]=[],missing:string[]=[];
  files.forEach((r,i)=>{
    if(r.status!=="fulfilled"){missing.push(i===0?"Brasil":"Exterior");return;}
    const raw=r.value;
    if(String(raw.ele)!==(i===0?id:"6257")||String(raw.t)!=="1"){missing.push(i===0?"Brasil":"Exterior");return;}
    generatedAt.push(`${raw.dg} ${raw.hg}`);
    for(const a of raw.abr??[]){
      if(i===0&&a.cdabr in STATES)states.push(normalizeTerritory(a,STATES[a.cdabr]));
      if(i===1){const city=localities.cities.find(c=>c.code===String(a.cdabr));if(city)cities.push(normalizeTerritory(a,city.name));}
    }
  });
  return {states,cities,generatedAt,checkedAt,missing};
}
