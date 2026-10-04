"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {flushSync} from "react-dom";
import {Globe2,MapPin,RefreshCw,ShieldCheck,ExternalLink,Clock3,Users,Vote,BarChart3,Search,Info,ChevronLeft,ChevronRight,Radio,Telescope} from "lucide-react";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Progress} from "@/components/ui/progress";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from "@/components/ui/table";
import {Pagination,PaginationContent,PaginationItem,PaginationLink} from "@/components/ui/pagination";
import {COUNTRIES,INITIAL_SELECTION,apiURL,effectiveOffice,querySelection,selectionLabel,validateSelection,type Selection} from "@/lib/election-client";
import {CONTINENTS,OFFICE_LABELS,percent,type ElectionResult,type Overview,type ResultResponse,type Territory} from "@/lib/election-model";
import geography from "@/lib/election-geography.json";
import mapData from "@/lib/election-map.json";
import bootstrap from "@/lib/election-bootstrap.json";

const fmt=(n:number)=>new Intl.NumberFormat("pt-BR").format(n);
const pct=(n:number)=>new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+"%";
const time=(iso:string)=>new Date(iso).toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",second:"2-digit"});
const COLORS=["#22d3ee","#3b82f6","#8b5cf6","#67e8f9","#a78bfa","#93c5fd"];
const match=(a:string,b:string)=>a.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(b.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase());
type Row=Territory&{type:"state"|"country"|"city";available:boolean};
function Picker({value,onChange,label,items}:{value:string;onChange:(value:string)=>void;label:string;items:{value:string;label:string;disabled?:boolean}[]}){
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="filter-select"><SelectValue/></SelectTrigger><SelectContent position="popper" className="max-h-80">{items.map(item=><SelectItem key={item.value} value={item.value} disabled={item.disabled}>{item.label}</SelectItem>)}</SelectContent></Select>;
}
function sumRows(rows:Territory[],code:string,name:string):Territory{return {code,name,sections:rows.reduce((n,r)=>n+r.sections,0),totalSections:rows.reduce((n,r)=>n+r.totalSections,0),eligible:rows.reduce((n,r)=>n+r.eligible,0),attended:rows.reduce((n,r)=>n+r.attended,0),status:rows.length&&rows.every(r=>r.status==="f")?"f":rows.some(r=>r.status==="p"||r.status==="f")?"p":"n"};}

export default function ElectionDashboard(){
  const [selection,setSelection]=useState<Selection>(INITIAL_SELECTION);
  const [result,setResult]=useState<ElectionResult|null>(bootstrap.result as ElectionResult);
  const [overview,setOverview]=useState<Overview>(bootstrap.overview as Overview);
  const [auto,setAuto]=useState(true),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(false);
  const [checkedAt,setCheckedAt]=useState(""),[error,setError]=useState(""),[partial,setPartial]=useState("");
  const [nextRefresh,setNextRefresh]=useState(30),[showAll,setShowAll]=useState(false),[candidateSearch,setCandidateSearch]=useState("");
  const [territorySearch,setTerritorySearch]=useState(""),[tablePage,setTablePage]=useState(0),[hoverName,setHoverName]=useState("");
  const selectionKey=JSON.stringify(selection),office=effectiveOffice(selection);
  const resultKey=useRef(selectionKey),generation=useRef(0),latest=useRef({selection,result,checkedAt,partial,error});
  latest.current={selection,result,checkedAt,partial,error};
  const update=(changes:Partial<Selection>)=>{setSelection(s=>validateSelection({...s,...changes}));setShowAll(false);setCandidateSearch("");setTablePage(0);};

  useEffect(()=>{
    const controller=new AbortController();const run=++generation.current;
    if(resultKey.current!==selectionKey){setResult(null);setCheckedAt("");resultKey.current=selectionKey;}
    setLoading(true);setError("");setPartial("");
    querySelection(selection,controller.signal).then(response=>{
      if(generation.current!==run)return;
      setResult(response.data);setCheckedAt(response.checkedAt);
      if(response.partial)setPartial(`Consulta parcial: ${response.received} de ${response.expected} localidades disponíveis. As demais serão consultadas novamente.`);
    }).catch(err=>{if(!controller.signal.aborted&&generation.current===run)setError(err instanceof Error?err.message:"Não foi possível atualizar os resultados.");}).finally(()=>{if(!controller.signal.aborted&&generation.current===run){setLoading(false);setNextRefresh(30);}});
    return ()=>controller.abort();
  // Selection is represented by a stable serialized key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectionKey,refresh]);

  useEffect(()=>{
    const controller=new AbortController();
    fetch(apiURL(`/api/overview?office=${office}`),{signal:controller.signal,cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error();return await response.json() as Overview;}).then(data=>{setOverview(current=>({...data,states:data.missing.includes("Brasil")?current.states:data.states,cities:data.missing.includes("Exterior")?current.cities:data.cities}));}).catch(()=>{if(!controller.signal.aborted)setOverview(current=>({...current,missing:["Brasil","Exterior"]}));});
    return ()=>controller.abort();
  },[office,refresh]);

  useEffect(()=>{
    if(!auto)return;
    const timer=setInterval(()=>{
      if(document.hidden||loading)return;
      setNextRefresh(n=>{if(n<=1){setRefresh(r=>r+1);return 30;}return n-1;});
    },1000);
    const onVisible=()=>{if(!document.hidden&&latest.current.checkedAt&&Date.now()-Date.parse(latest.current.checkedAt)>30000)setRefresh(r=>r+1);};
    document.addEventListener("visibilitychange",onVisible);
    return ()=>{clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);};
  },[auto,loading]);

  useEffect(()=>{
    const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool)return;
    const controller=new AbortController();
    const tools=[
      {name:"read_election_results",description:"Lê a apuração oficial atualmente exibida, com região, horário da consulta e estado de atualização.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({selection:latest.current.selection,checkedAt:latest.current.checkedAt,partial:latest.current.partial,error:latest.current.error,result:latest.current.result})},
      {name:"select_election_area",description:"Seleciona a região ou cargo da apuração brasileira e inicia a consulta visível. world reúne Brasil e exterior; brasil permite estados; exterior permite continentes, países e cidades.",inputSchema:{type:"object",properties:{scope:{type:"string",enum:["world","brasil","exterior"]},office:{type:"string",enum:["1","3","5","6","7","8"]},uf:{type:"string"},continent:{type:"string",enum:["all",...CONTINENTS]},country:{type:"string"},city:{type:"string"}},required:["scope"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input:unknown)=>{const selected=validateSelection(input);flushSync(()=>setSelection(selected));return {selection:latest.current.selection,status:"região selecionada; consulta iniciada"};}},
    ];
    for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}}
    return ()=>controller.abort();
  },[]);

  const countryTotals=useMemo(()=>COUNTRIES.map(c=>sumRows(overview.cities.filter(city=>c.cities.some(l=>l.code===city.code)),c.code,c.name)),[overview]);
  const domesticTotal=useMemo(()=>sumRows(overview.states,"BR","Brasil"),[overview]);
  const regions=useMemo(()=>CONTINENTS.map(continent=>{
    const countries=COUNTRIES.filter(c=>c.continent===continent);const codes=new Set(countries.flatMap(c=>c.cities.map(l=>l.code)));
    return {...sumRows(overview.cities.filter(c=>codes.has(c.code)),continent,continent),countries:countries.length};
  }),[overview]);
  const rows=useMemo<Row[]>(()=>{
    if(selection.scope==="brasil")return geography.states.map(u=>({...overview.states.find(r=>r.code===u.code)??{code:u.code,name:u.name,sections:0,totalSections:0,eligible:0,attended:0,status:"n"},type:"state",available:!overview.missing.includes("Brasil")&&overview.states.some(r=>r.code===u.code)}));
    if(selection.scope==="exterior"&&selection.country!=="all"){
      return geography.cities.filter(c=>c.countryCode===selection.country).map(c=>({...overview.cities.find(r=>r.code===c.code)??{code:c.code,name:c.name,sections:0,totalSections:0,eligible:0,attended:0,status:"n"},type:"city",available:!overview.missing.includes("Exterior")&&overview.cities.some(r=>r.code===c.code)}));
    }
    const countries=countryTotals.filter(c=>selection.continent==="all"||COUNTRIES.find(country=>country.code===c.code)?.continent===selection.continent).map(c=>({...c,type:"country" as const,available:!overview.missing.includes("Exterior")&&overview.cities.length>0}));
    return selection.scope==="world"?[{...domesticTotal,type:"country",available:!overview.missing.includes("Brasil")&&overview.states.length>0},...countries]:countries;
  },[selection,overview,countryTotals,domesticTotal]);
  const filteredRows=rows.filter(r=>match(r.name,territorySearch)).sort((a,b)=>b.eligible-a.eligible||a.name.localeCompare(b.name,"pt-BR"));
  const maxPage=Math.max(0,Math.ceil(filteredRows.length/6)-1),visibleRows=filteredRows.slice(Math.min(tablePage,maxPage)*6,Math.min(tablePage,maxPage)*6+6);
  const currentCountry=COUNTRIES.find(c=>c.code===selection.country);
  const selectedCountries=COUNTRIES.filter(c=>selection.continent==="all"||c.continent===selection.continent);
  const candidates=(result?.candidates??[]).filter(c=>match(`${c.name} ${c.party} ${c.number}`,candidateSearch));
  if(result?.office==="1"){
    const priority=(number:string)=>number==="22"?0:number==="13"?1:2;
    candidates.sort((a,b)=>priority(a.number)-priority(b.number));
  }
  const visibleCandidates=showAll?candidates:candidates.slice(0,5);
  const stats=result?.stats,started=!!result&&result.status!=="n";
  const sectionPercent=stats?percent(stats.sections,stats.totalSections):0;
  const areaLabel=selectionLabel(selection);
  const connectionClass=error?"error":!auto||!checkedAt||!started?"waiting":"live";
  const connectionLabel=error?"Atualização indisponível":!auto?"Atualização pausada":!checkedAt?"Conectando ao TSE":result?.status==="f"?"Apuração finalizada":started?"Apuração ao vivo":"Aguardando apuração";
  const selectRow=(r:Row)=>{
    if(r.type==="state")update({scope:"brasil",uf:r.code});
    else if(r.type==="city")update({city:r.code});
    else if(r.code==="BR")update({scope:"brasil",uf:"all",office:"1"});
    else {const country=COUNTRIES.find(c=>c.code===r.code);if(country)update({scope:"exterior",country:r.code,continent:country.continent,city:"all",office:"1"});}
  };
  const chooseRegion=(name:string)=>{
    if(name==="Brasil")update({scope:"brasil",uf:"all",office:"1"});
    else update({scope:"exterior",continent:name,country:"all",city:"all",office:"1"});
  };

  return <>
    <a href="#apuracao" className="skip-link">Ir para a apuração</a>
    <header className="site-header"><a className="brand" href="https://orbelabz.com/" aria-label="Voltar à página inicial da OrbeLabz"><span className="brand-mark"><img src="./favicon.svg" alt="" width={36} height={36}/></span><span className="brand-name">Orbe<span className="brand-labz">Labz</span><span className="brand-app"> - Apuração</span></span><span className="brand-separator"/><span className="brand-edition">ELEIÇÕES 2026</span></a><div className="header-right"><span className="header-date">04 de outubro de 2026</span><span className="turn-badge">1º turno</span><a className="source-link" href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer" aria-label="Abrir resultados oficiais do TSE">Fonte: TSE <ExternalLink size={14}/></a></div></header>
    <main className="workspace" id="apuracao">
      <div className="page-heading"><div><p className="eyebrow">CADA VOTO, EM QUALQUER LUGAR</p><h1>Apuração em tempo real</h1><p>O voto dos brasileiros. No Brasil e no mundo.</p></div><div className="heading-status"><div className={`connection ${connectionClass}`} role="status"><span className="connection-dot"/>{connectionLabel}</div><div className="sync-copy">{checkedAt?`Consultado às ${time(checkedAt)}`:"Horário de Brasília · UTC−3"}</div></div></div>
      <Tabs value={selection.scope} onValueChange={scope=>update({scope:scope as Selection["scope"],office:scope==="brasil"?selection.office:"1",country:"all",city:"all",continent:"all"})}>
        <div className="scope-strip"><TabsList className="scope-tabs" aria-label="Abrangência dos resultados"><TabsTrigger value="world" className="scope-tab"><Globe2/>Visão global</TabsTrigger><TabsTrigger value="brasil" className="scope-tab"><MapPin/>Brasil</TabsTrigger><TabsTrigger value="exterior" className="scope-tab"><Globe2/>Exterior</TabsTrigger></TabsList><div className="auto-controls"><Switch checked={auto} onCheckedChange={setAuto} aria-label="Atualização automática" size="sm"/><span>Atualização automática</span><span style={{fontFamily:"var(--font-mono)",fontSize:12,minWidth:28}}>{auto?`${nextRefresh}s`:"—"}</span><button className={`refresh-button ${loading?"spinning":""}`} onClick={()=>setRefresh(n=>n+1)} disabled={loading} aria-label="Atualizar resultados agora" title="Atualizar agora"><RefreshCw/></button></div></div>
        {["world","brasil","exterior"].map(scope=><TabsContent key={scope} value={scope} className="m-0">
          <div className="filters"><div className="filter-block"><span className="filter-label">Cargo</span><Picker label="Cargo em disputa" value={selection.office} onChange={value=>update({office:value,uf:value!=="1"&&selection.uf==="all"?"sp":selection.uf})} items={Object.entries(OFFICE_LABELS).filter(([id])=>id!=="8").map(([value,label])=>({value,label:value==="7"&&selection.uf==="df"?"Deputado distrital":label}))}/></div>
            {selection.scope==="brasil"&&<><div className="filter-divider"/><div className="filter-block"><span className="filter-label">Estado</span><Picker label="Estado brasileiro" value={selection.uf} onChange={uf=>update({uf})} items={[{value:"all",label:"Todos os estados",disabled:selection.office!=="1"},...geography.states.map(s=>({value:s.code,label:s.name}))]}/></div></>}
            {selection.scope==="exterior"&&<><div className="filter-divider"/><div className="filter-block"><span className="filter-label">Região</span><Picker label="Continente" value={selection.continent} onChange={continent=>update({continent,country:"all",city:"all"})} items={[{value:"all",label:"Todo o mundo"},...CONTINENTS.map(c=>({value:c,label:c}))]}/></div><div className="filter-block"><span className="filter-label">País</span><Picker label="País ou território" value={selection.country} onChange={country=>update({country,city:"all"})} items={[{value:"all",label:"Todos os países"},...selectedCountries.map(c=>({value:c.code,label:c.name}))]}/></div>{currentCountry&&<div className="filter-block"><span className="filter-label">Cidade</span><Picker label="Localidade eleitoral no exterior" value={selection.city} onChange={city=>update({city})} items={[{value:"all",label:"Todas as cidades"},...currentCountry.cities.map(c=>({value:c.code,label:c.name}))]}/></div>}</>}
            <span className="filter-note"><ShieldCheck/>{selection.scope==="brasil"&&office!=="1"?"Apuração por estado · escolha a UF":"Dados da Justiça Eleitoral"}</span>
          </div>
          {(error||partial||!started)&&<div className={`notice ${error?"error":""}`} role="status"><Info/><span>{error?<><strong>{checkedAt?"Não foi possível atualizar. ":"Consulta indisponível. "}</strong>{error}{checkedAt?" Os últimos dados recebidos foram mantidos.":""}</>:partial?<><strong>Dados incompletos. </strong>{partial}</>:<><strong>Aguardando a divulgação dos votos.</strong> A totalização oficial começa a partir das 17h de 04/10, horário de Brasília, inclusive para o exterior.</>}</span></div>}
          <section className="stats-grid" aria-label={`Resumo da apuração: ${areaLabel}`}>
            <div className="stat-card"><div className="stat-label">Seções totalizadas<BarChart3/></div><div className="stat-value">{stats?pct(sectionPercent):"—"}</div><div className="stat-detail">{stats?`${fmt(stats.sections)} de ${fmt(stats.totalSections)} seções`:"Aguardando dados oficiais"}</div><Progress className="progress" value={sectionPercent} aria-label="Percentual de seções totalizadas"/></div>
            <div className="stat-card"><div className="stat-label">Votos computados<Vote/></div><div className="stat-value">{stats?fmt(stats.votes):"—"}</div><div className="stat-detail">{started?`${fmt(stats!.valid)} votos válidos`:"Totalização ainda não iniciada"}</div></div>
            <div className="stat-card"><div className="stat-label">Eleitores aptos<Users/></div><div className="stat-value">{stats?fmt(stats.eligible):"—"}</div><div className="stat-detail">{areaLabel}</div></div>
            <div className="stat-card"><div className="stat-label">Comparecimento<Users/></div><div className="stat-value">{started&&stats?pct(percent(stats.attended,stats.eligibleCounted)):"—"}</div><div className="stat-detail">{started&&stats?`${fmt(stats.attended)} eleitores nas seções totalizadas`:"Disponível conforme as urnas chegam"}</div></div>
          </section>
          <div className="primary-grid">
            <section className="panel"><div className="panel-header"><div><h2>{OFFICE_LABELS[office]} <span style={{color:"#68798e",fontWeight:400}}> / </span> {areaLabel}</h2><p className="panel-subtitle">{started?"Percentual dos votos computados a candidatos":"Candidaturas oficiais · aguardando votos"}</p>{office==="1"&&<p className="panel-subtitle">Ordem de exibição personalizada: Flávio Bolsonaro, Lula e demais candidatos.</p>}</div><span className="small-tag">{result?.status==="f"?"Finalizada":started?"Parcial":"Pré-apuração"}</span></div>
              <div className="candidates">{showAll&&<input className="candidate-search" aria-label="Buscar candidato por nome, partido ou número" placeholder="Nome, partido ou número do candidato" value={candidateSearch} onChange={e=>setCandidateSearch(e.target.value)}/>}
                {!result?<div className="empty-state"><Radio/><strong>{loading?"Consultando o TSE":"Resultados indisponíveis"}</strong><p>{loading?"Buscando a apuração desta região.":"A consulta será repetida automaticamente quando a atualização estiver ativada."}</p></div>:!candidates.length?<div className="empty-state"><Search/><strong>Nenhum candidato encontrado</strong><p>Tente buscar por outro nome, partido ou número.</p></div>:<div className={showAll?"candidate-scroll":""}>{visibleCandidates.map(candidate=>{
                  const color=COLORS[Number(candidate.number)%COLORS.length];
                  return <div className="candidate" key={candidate.id}><div className="candidate-top"><span className="candidate-avatar" style={{background:color+"10",borderColor:color+"30",color}} aria-hidden="true">{candidate.name.split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("")}</span><div style={{minWidth:0}}><p className="candidate-name">{candidate.name}</p><div className="candidate-meta"><span>{candidate.party}</span><span className="candidate-number">{candidate.number}</span>{candidate.outcome&&<span className="candidate-outcome">{candidate.outcome}</span>}{candidate.destination&&candidate.destination!=="Válido"&&<span>{candidate.destination}</span>}</div></div><div className="candidate-score"><div className="candidate-percent" style={{color:started?color:"#72839a"}}>{started?pct(candidate.percent):"—"}</div><div className="candidate-votes">{started?`${fmt(candidate.votes)} votos`:"aguardando"}</div></div></div><div className="candidate-bar" role="img" aria-label={started?`${candidate.name}: ${pct(candidate.percent)}`:`${candidate.name}: aguardando totalização`}><span style={{width:`${started?candidate.percent:0}%`,background:color}}/></div></div>;
                })}</div>}
              </div><div className="list-controls"><span>{result?`${result.candidates.length} candidatos`:"Fonte oficial: TSE"}</span>{(result?.candidates.length??0)>5&&<button className="text-button" onClick={()=>{setShowAll(!showAll);setCandidateSearch("");}}>{showAll?"Ver menos":"Ver todos os candidatos"}</button>}</div>
            </section>
            <section className="panel map-panel"><div className="panel-header"><div><h2>{selection.scope==="brasil"?"O voto pelo Brasil":"O voto pelo mundo"}</h2><p className="panel-subtitle">{selection.scope==="brasil"?"27 unidades da Federação":`${COUNTRIES.length} países e territórios · ${geography.cities.length} localidades no exterior`}</p></div><Globe2 size={19} color="#7f91a8"/></div>
              <svg className="world-map" viewBox={selection.scope==="brasil"?"0 0 520 350":"0 0 800 370"} aria-label={selection.scope==="brasil"?"Mapa dos estados brasileiros. Selecione um estado.":"Mapa mundial das localidades eleitorais. Selecione um país."} role="group">
                {selection.scope==="brasil"?mapData.states.map(s=>{
                  const selected=s.code===selection.uf;const t=overview.states.find(r=>r.code===s.code);const p=t?percent(t.sections,t.totalSections):0;
                  return <g key={s.code}><path d={s.path} className={`map-region has-polls ${selected?"selected":""}`} style={!selected&&p>0?{fill:`hsl(194 65% ${22+p*.32}%)`}:undefined} tabIndex={0} role="button" aria-label={`Consultar ${s.name}`} onClick={()=>update({uf:s.code})} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();update({uf:s.code});}}} onMouseEnter={()=>setHoverName(`${s.name} · ${pct(p)} das seções`)} onMouseLeave={()=>setHoverName("")}><title>{s.name} · {pct(p)} totalizado</title></path><text x={s.x} y={s.y} className="map-label" textAnchor="middle" dominantBaseline="middle">{s.code.toUpperCase()}</text></g>;
                }):mapData.world.map(country=>{
                  const item=COUNTRIES.find(c=>c.code===country.code),isBrazil=country.code==="BR",selectable=!!item||isBrazil;
                  const selected=selection.scope==="exterior"&&(selection.country===country.code||(selection.country==="all"&&selection.continent!=="all"&&item?.continent===selection.continent));
                  const r=isBrazil?domesticTotal:countryTotals.find(c=>c.code===country.code);const p=r?percent(r.sections,r.totalSections):0;
                  const select=()=>{if(isBrazil)chooseRegion("Brasil");else if(item)update({scope:"exterior",country:item.code,continent:item.continent,city:"all",office:"1"});};
                  return <path key={country.code+country.name} d={country.path} className={`map-region ${selectable?"has-polls":""} ${selected?"selected":""}`} style={!selected&&p>0?{fill:`hsl(194 65% ${22+p*.32}%)`}:undefined} tabIndex={selectable?0:undefined} role={selectable?"button":undefined} aria-label={selectable?`Consultar ${item?.name??country.name}`:undefined} onClick={selectable?select:undefined} onKeyDown={selectable?e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select();}}:undefined} onMouseEnter={()=>setHoverName(`${item?.name??country.name}${selectable?` · ${pct(p)} das seções`:""}`)} onMouseLeave={()=>setHoverName("")}><title>{item?.name??country.name}{selectable?` · ${pct(p)} totalizado`:""}</title></path>;
                })}
              </svg><div className="map-legend"><span><i className="legend-key" style={{background:"#163651"}}/>Local de votação</span><span><i className="legend-key" style={{background:"#22d3ee"}}/>Seleção / totalização</span></div><div className="map-caption" aria-live="polite">{overview.missing.length?`Andamento regional sem atualização: ${overview.missing.join(" e ")}. Os dados anteriores foram mantidos.`:hoverName||"Selecione no mapa ou use os filtros para consultar a apuração."}</div>
              <div className="map-regions"><button className={`region-button ${selection.scope==="brasil"?"selected":""}`} onClick={()=>chooseRegion("Brasil")}><MapPin/>Brasil<strong>{overview.missing.includes("Brasil")?"—":pct(percent(domesticTotal.sections,domesticTotal.totalSections))}</strong><span>seções totalizadas</span></button>{regions.map(region=><button key={region.name} className={`region-button ${selection.continent===region.name&&selection.scope==="exterior"?"selected":""}`} onClick={()=>chooseRegion(region.name)}><Globe2/>{region.name}<strong>{overview.missing.includes("Exterior")?"—":pct(percent(region.sections,region.totalSections))}</strong><span>{region.countries} países e territórios</span></button>)}</div>
            </section>
          </div>
          <div className="secondary-grid">
            <section className="panel"><div className="panel-header"><div><h2>{selection.scope==="brasil"?"Apuração por estado":currentCountry?`Cidades · ${currentCountry.name}`:selection.continent!=="all"?`Países · ${selection.continent}`:"Apuração por país"}</h2><p className="panel-subtitle">Consulte uma região para ver seus candidatos e votos</p></div><label className="territory-search"><Search/><input aria-label="Buscar região na tabela" placeholder="Buscar local" value={territorySearch} onChange={e=>{setTerritorySearch(e.target.value);setTablePage(0);}}/></label></div>
              <Table className="region-table"><TableHeader><TableRow><TableHead>Local</TableHead><TableHead className="text-right">Totalizado</TableHead><TableHead className="text-right">Comparecimento</TableHead></TableRow></TableHeader><TableBody>{visibleRows.map(row=><TableRow key={row.code} tabIndex={0} role="button" aria-label={`Ver apuração de ${row.name}`} onClick={()=>selectRow(row)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectRow(row);}}}><TableCell><span className="territory"><span className="territory-code">{row.type==="city"?<MapPin size={12}/>:row.code.toUpperCase()}</span>{row.name}</span></TableCell><TableCell className="table-percent"><span className="progress-cell"><Progress className="mini-progress" value={percent(row.sections,row.totalSections)} aria-label={`Seções totalizadas em ${row.name}`}/>{row.available?pct(percent(row.sections,row.totalSections)):"—"}</span></TableCell><TableCell className="table-count">{row.available&&row.status!=="n"?fmt(row.attended):<span className="table-status">{row.available?"Aguardando":"Sem atualização"}</span>}</TableCell></TableRow>)}</TableBody></Table>{!visibleRows.length&&<div className="table-empty">Nenhuma região encontrada. Tente outra busca.</div>}
              <div className="table-footer"><span>{filteredRows.length} {selection.scope==="brasil"?"estados":currentCountry?"localidades":"países e territórios"}</span><Pagination className="table-pager w-auto mx-0" aria-label="Paginação de regiões"><PaginationContent><PaginationItem><PaginationLink href="#apuracao" aria-label="Página anterior" aria-disabled={tablePage===0} tabIndex={tablePage===0?-1:0} size="icon" onClick={e=>{e.preventDefault();if(tablePage>0)setTablePage(p=>p-1);}}><ChevronLeft size={16}/></PaginationLink></PaginationItem><PaginationItem><span>{Math.min(tablePage,maxPage)+1} / {maxPage+1}</span></PaginationItem><PaginationItem><PaginationLink href="#apuracao" aria-label="Próxima página" aria-disabled={tablePage>=maxPage} tabIndex={tablePage>=maxPage?-1:0} size="icon" onClick={e=>{e.preventDefault();if(tablePage<maxPage)setTablePage(p=>p+1);}}><ChevronRight size={16}/></PaginationLink></PaginationItem></PaginationContent></Pagination></div>
              {currentCountry&&<div className="selected-country-info"><span>Votos de brasileiros em {currentCountry.name}</span><span className="coverage-count">{currentCountry.cities.length} localidades</span></div>}
            </section>
            <section className="panel"><div className="panel-header"><div><h2>Detalhes da votação</h2><p className="panel-subtitle">{areaLabel}</p></div><Vote size={19} color="#7f91a8"/></div><div className="voting-breakdown"><div className="votes-composition" role="img" aria-label={started?"Composição dos votos recebidos":"Aguardando votos para a composição"}>{stats&&[{n:stats.valid,color:"#22d3ee"},{n:stats.white,color:"#6f829b"},{n:stats.null,color:"#93c5fd"},{n:stats.annulled+stats.subJudice,color:"#8b5cf6"}].map((v,i)=><span key={i} style={{width:`${percent(v.n,stats.votes)}%`,background:v.color}}/>)}</div>
              {[{label:"Votos válidos",n:stats?.valid,color:"#22d3ee"},{label:"Votos em branco",n:stats?.white,color:"#6f829b"},{label:"Votos nulos",n:stats?.null,color:"#93c5fd"},{label:"Anulados e sub judice",n:(stats?.annulled??0)+(stats?.subJudice??0),color:"#8b5cf6"},{label:"Abstenções",n:stats?.abstained,color:"#536578"}].map((v,i)=><div className="breakdown-row" key={v.label}><span className="breakdown-label"><i className="legend-key" style={{background:v.color,margin:0}}/>{v.label}</span><span className="breakdown-value">{started&&v.n!==undefined?fmt(v.n):"—"}{started&&stats&&v.n!==undefined&&<small>{pct(percent(v.n,i===4?stats.eligibleCounted:stats.votes))}</small>}</span></div>)}
              <p className="breakdown-note">{selection.scope==="world"?"O total geral do TSE já inclui os votos no Brasil e no exterior. Os votos do exterior não são somados novamente.":result?.aggregate?"Esta região reúne os arquivos oficiais de suas localidades. Arquivos podem ter horários de totalização diferentes.":selection.scope==="exterior"?"Brasileiros com domicílio eleitoral no exterior votam para presidente da República.":"Os percentuais de comparecimento e abstenção consideram o eleitorado das seções já totalizadas."}</p>
              <div className="source-freshness">{result?`${started?"Última totalização":"Arquivo de preparação"}: ${result.sourceTimes.length===1?result.sourceTimes[0]:`${result.sourceTimes.length} arquivos com horários distintos`}`:"Aguardando o arquivo oficial"}{error&&checkedAt?" · Atualização pendente":""}</div>
            </div></section>
          </div>
        </TabsContent>)}
      </Tabs>
      <footer className="source-footer"><span><span className="footer-brand">OrbeLabz - Apuração</span> · Um painel independente com dados oficiais do TSE.</span><span><a href="https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados" target="_blank" rel="noopener noreferrer">Sobre os dados</a> · Cartografia: IBGE e Natural Earth · Horário de Brasília</span></footer>
    </main>
  </>;
}
