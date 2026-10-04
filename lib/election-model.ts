export type Scope = "world" | "brasil" | "exterior";
export type Candidate = {
  id:string; name:string; number:string; party:string; votes:number; percent:number;
  destination:string; outcome:string; order:number;
};
export type ElectionStats = {
  totalSections:number; sections:number; eligible:number; eligibleCounted:number;
  attended:number; abstained:number; votes:number; candidateVotes:number;
  valid:number; white:number; null:number; annulled:number; subJudice:number;
};
export type ElectionResult = {
  office:string; area:string; status:"n"|"p"|"f"; candidates:Candidate[];
  stats:ElectionStats; sourceTimes:string[]; sources:string[]; aggregate:boolean;
};
export type ResultResponse = {
  data:ElectionResult|null; checkedAt:string; missing:string[]; partial:boolean;
  expected:number; received:number; message?:string;
};
export type Locality = {code:string; name:string; country:string; countryCode:string; continent:string};
export type Country = {code:string; name:string; continent:string; cities:Locality[]};
export type Territory = {code:string; name:string; sections:number; totalSections:number; eligible:number; attended:number; status:string};
export type Overview = {states:Territory[]; cities:Territory[]; generatedAt:string[]; checkedAt:string; missing:string[]};
export type RawRecord = Record<string,any>;
export const OFFICE_LABELS:Record<string,string>={"1":"Presidente","3":"Governador","5":"Senador","6":"Deputado federal","7":"Deputado estadual","8":"Deputado distrital"};
export const STATES:Record<string,string>={ac:"Acre",al:"Alagoas",am:"Amazonas",ap:"Amapá",ba:"Bahia",ce:"Ceará",df:"Distrito Federal",es:"Espírito Santo",go:"Goiás",ma:"Maranhão",mg:"Minas Gerais",ms:"Mato Grosso do Sul",mt:"Mato Grosso",pa:"Pará",pb:"Paraíba",pe:"Pernambuco",pi:"Piauí",pr:"Paraná",rj:"Rio de Janeiro",rn:"Rio Grande do Norte",ro:"Rondônia",rr:"Roraima",rs:"Rio Grande do Sul",sc:"Santa Catarina",se:"Sergipe",sp:"São Paulo",to:"Tocantins"};
export const CONTINENTS=["Américas","Europa","Ásia","África","Oceania"];
export const numberOf=(v:unknown):number=>{
  if(v===null||v===undefined||v==="")return 0;
  const n=Number(String(v).replace(",","."));
  return Number.isFinite(n)&&n>=0?n:0;
};
export const percent=(part:number,total:number)=>total>0?Math.min(100,Math.max(0,part/total*100)):0;
export const emptyStats=():ElectionStats=>({totalSections:0,sections:0,eligible:0,eligibleCounted:0,attended:0,abstained:0,votes:0,candidateVotes:0,valid:0,white:0,null:0,annulled:0,subJudice:0});
export function normalizeResult(raw:RawRecord,url:string,office:string):ElectionResult {
  const cargo=(raw.carg??[]).find((c:RawRecord)=>String(c.cd)===office);
  if(!cargo)throw new Error("Cargo ausente no arquivo oficial");
  const candidates:Candidate[]=[];
  for(const group of cargo.agr??[])for(const party of group.par??[])for(const c of party.cand??[]){
    candidates.push({id:String(c.sqcand),name:String(c.nmu||c.nm),number:String(c.n),party:String(party.sg),votes:numberOf(c.vap),percent:numberOf(c.pvapn??c.pvap),destination:String(c.dvt??""),outcome:String(c.st??""),order:numberOf(c.seq)});
  }
  candidates.sort((a,b)=>b.votes-a.votes||a.order-b.order||a.number.localeCompare(b.number));
  const s=raw.s??{},e=raw.e??{},v=raw.v??{};
  return {office,area:String(raw.cdabr),status:raw.and??"n",candidates,aggregate:false,
    stats:{totalSections:numberOf(s.ts),sections:numberOf(s.st),eligible:numberOf(e.te),eligibleCounted:numberOf(e.esi),attended:numberOf(e.c),abstained:numberOf(e.a),votes:numberOf(v.tv),candidateVotes:numberOf(v.vvc),valid:numberOf(v.vv),white:numberOf(v.vb),null:numberOf(v.tvn),annulled:numberOf(v.van),subJudice:numberOf(v.vansj)},
    sourceTimes:[`${raw.dt||raw.dg} ${raw.ht||raw.hg}`],sources:[url]};
}
export function aggregateResults(results:ElectionResult[],area:string):ElectionResult|null {
  if(!results.length)return null;
  const stats=emptyStats();const candidates=new Map<string,Candidate>();
  for(const r of results){
    for(const k of Object.keys(stats) as (keyof ElectionStats)[])stats[k]+=r.stats[k];
    for(const c of r.candidates){const old=candidates.get(c.id);candidates.set(c.id,{...c,votes:(old?.votes??0)+c.votes,outcome:""});}
  }
  return {office:results[0].office,area,status:results.every(r=>r.status==="f")?"f":results.some(r=>r.status!=="n")?"p":"n",aggregate:true,stats,
    candidates:[...candidates.values()].map(c=>({...c,percent:percent(c.votes,stats.candidateVotes)})).sort((a,b)=>b.votes-a.votes||a.order-b.order),
    sourceTimes:[...new Set(results.flatMap(r=>r.sourceTimes))],sources:results.flatMap(r=>r.sources)};
}
export function normalizeTerritory(raw:RawRecord,name:string):Territory {
  return {code:String(raw.cdabr),name,sections:numberOf(raw.s?.st),totalSections:numberOf(raw.s?.ts),eligible:numberOf(raw.e?.te),attended:numberOf(raw.e?.c),status:raw.and??"n"};
}
