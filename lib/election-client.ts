import geography from "./election-geography.json";
import {aggregateResults,OFFICE_LABELS,type ResultResponse,type Scope,type Country} from "./election-model";

export type Selection={scope:Scope;office:string;uf:string;continent:string;country:string;city:string};
export const INITIAL_SELECTION:Selection={scope:"world",office:"1",uf:"all",continent:"all",country:"all",city:"all"};
export const COUNTRIES:Country[]=geography.countries;
export function apiURL(path:string){return `${process.env.NEXT_PUBLIC_API_ORIGIN??""}${path}`;}
export function effectiveOffice(s:Selection){return s.scope!=="brasil"?"1":s.office==="7"&&s.uf==="df"?"8":s.office;}
export function selectionLabel(s:Selection){
  if(s.scope==="world")return "Brasil + exterior";
  if(s.scope==="brasil")return s.uf==="all"?"Todos os estados":geography.states.find(u=>u.code===s.uf)?.name??s.uf;
  const city=geography.cities.find(c=>c.code===s.city);
  if(city)return `${city.name} · ${city.country}`;
  if(s.country!=="all")return COUNTRIES.find(c=>c.code===s.country)?.name??s.country;
  return s.continent==="all"?"Exterior · todo o mundo":`Exterior · ${s.continent}`;
}
export async function querySelection(s:Selection,signal:AbortSignal):Promise<ResultResponse>{
  const office=effectiveOffice(s);
  const get=async(query:string):Promise<ResultResponse>=>{
    const response=await fetch(apiURL(`/api/results?office=${office}&${query}`),{signal,cache:"no-store"});
    const json=await response.json() as ResultResponse;
    if(!response.ok||!json.data)throw new Error(json.message??"Resultados ainda indisponíveis para esta consulta.");
    return json;
  };
  if(s.scope==="world")return get("uf=br");
  if(s.scope==="brasil")return get(s.uf==="all"?"states=all":`uf=${s.uf}`);
  if(s.city!=="all")return get(`uf=zz&city=${s.city}`);
  if(s.country==="all"&&s.continent==="all")return get("uf=zz");
  const cities=geography.cities.filter(c=>(s.country==="all"||c.countryCode===s.country)&&(s.continent==="all"||c.continent===s.continent));
  const batches:string[][]=[];for(let i=0;i<cities.length;i+=20)batches.push(cities.slice(i,i+20).map(c=>c.code));
  if(!batches.length)throw new Error("Nenhuma localidade eleitoral nesta seleção.");
  const responses:ResultResponse[]=[];const missing:string[]=[];let cursor=0;
  await Promise.all(Array.from({length:Math.min(2,batches.length)},async()=>{
    while(cursor<batches.length){const codes=batches[cursor++];try{responses.push(await get(`cities=${codes.join(",")}`));}catch(error){if(signal.aborted)throw error;missing.push(...codes);}}
  }));
  const data=aggregateResults(responses.map(r=>r.data).filter(r=>r!==null),selectionLabel(s));
  if(!data)throw new Error("Os resultados desta região ainda não estão disponíveis no TSE.");
  const allMissing=[...missing,...responses.flatMap(r=>r.missing)];
  return {data,missing:allMissing,partial:allMissing.length>0,expected:cities.length,received:responses.reduce((n,r)=>n+r.received,0),checkedAt:new Date().toISOString()};
}
export function validateSelection(input:unknown):Selection{
  if(!input||typeof input!=="object")throw new Error("Informe uma região válida.");
  const x=input as Record<string,unknown>;
  const s={...INITIAL_SELECTION,...x} as Selection;
  if(!["world","brasil","exterior"].includes(s.scope)||!OFFICE_LABELS[s.office])throw new Error("Escopo ou cargo inválido.");
  if(s.uf!=="all"&&!geography.states.some(u=>u.code===s.uf))throw new Error("Estado inválido.");
  if(s.country!=="all"&&!COUNTRIES.some(c=>c.code===s.country))throw new Error("País inválido.");
  if(s.continent!=="all"&&!["Américas","Europa","Ásia","África","Oceania"].includes(s.continent))throw new Error("Continente inválido.");
  if(s.city!=="all"&&!geography.cities.some(c=>c.code===s.city))throw new Error("Cidade inválida.");
  if(s.scope!=="brasil")s.office="1";
  if(s.office==="8"){s.uf="df";s.office="7";}
  if(s.office!=="1"&&s.uf==="all")s.uf="sp";
  if(s.city!=="all"){const c=geography.cities.find(c=>c.code===s.city)!;s.country=c.countryCode;s.continent=c.continent;}
  if(s.country!=="all"){s.continent=COUNTRIES.find(c=>c.code===s.country)!.continent;}
  return s;
}
