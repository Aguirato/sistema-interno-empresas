import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {ArrowRight,Download,Search,Printer,Clock3,Activity,Table2} from 'lucide-react';
import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from '@/components/ui/table';
import {dateLabel} from '@/lib/fleet';
import ReadingReports from './ReadingReports';
import {groupReadings,readingCount,readingNames,readingProfileName,readingLongCSV,readingWideCSV,type ReadingRecord} from './reading-utils';
import {last24Hours,readingQuery,type ReadingFilters} from './reading-query';
import {readingPrintDocument} from './reading-print';
const ReadingCharts=lazy(()=>import('./ReadingCharts'));

type Entity={id:string;name:string;active?:boolean|number;plant_id?:string};
type QueryResult={readings:ReadingRecord[];total:number;page:number;page_size:number;from:string;to:string};
type Props={mode:'list'|'report';plants:Entity[];units:Entity[];fallback:string[][];refreshToken:number;onView:(reading:ReadingRecord)=>void;onExport:(rows:(string|number)[][],name:string)=>void};
export default function ReadingsWorkspace({mode,plants,units,fallback,refreshToken,onView,onExport}:Props){
 const [draft,setDraft]=useState<ReadingFilters>(()=>last24Hours()),[applied,setApplied]=useState<ReadingFilters|null>(null),[result,setResult]=useState<QueryResult|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[view,setView]=useState<'table'|'charts'>('table');
 const controller=useRef<AbortController|null>(null),serial=useRef(0),appliedRef=useRef<ReadingFilters|null>(null),rolling=useRef(true),initial=useRef(true);
 const lookup=useMemo(()=>({plant:(id:string)=>plants.find(p=>p.id===id)?.name||'Usina não encontrada',unit:(id:string)=>units.find(u=>u.id===id)?.name||'UG não encontrada'}),[plants,units]);
 const groups=useMemo(()=>mode==='report'&&result?groupReadings(result.readings,lookup,fallback):[],[mode,result,lookup,fallback]);
 const query=useCallback(async(filters:ReadingFilters,page=1)=>{
  controller.current?.abort();const sequence=++serial.current;
  setResult(null);setError('');setLoading(false);
  let params:URLSearchParams;try{params=readingQuery(filters,page,mode==='report')}catch(e){setError((e as Error).message);return}
  const abort=new AbortController();controller.current=abort;setLoading(true);setApplied({...filters});appliedRef.current={...filters};
  try{const response=await fetch('/api/readings?'+params.toString(),{cache:'no-store',signal:abort.signal});const body=await response.json() as QueryResult&{error?:string};if(!response.ok){if(response.status===401||response.status===428)window.dispatchEvent(new Event('cog-auth-lost'));throw Error(body.error||'Não foi possível consultar as leituras.')}
   if(sequence!==serial.current||abort.signal.aborted)return;
   setResult(body);
  }catch(e){if(sequence===serial.current&&!abort.signal.aborted)setError((e as Error).message)}finally{if(sequence===serial.current)setLoading(false)}
 },[mode]);
 useEffect(()=>{
  if(initial.current){initial.current=false;if(mode==='list'){const filters=last24Hours();setDraft(filters);void query(filters)}}
  else if(appliedRef.current){const filters=rolling.current?{...appliedRef.current,...last24Hours(),plant_id:appliedRef.current.plant_id,unit_id:appliedRef.current.unit_id,person:appliedRef.current.person,search:appliedRef.current.search}:appliedRef.current;setDraft(filters);void query(filters)}
 },[refreshToken,mode,query]);
 useEffect(()=>()=>{++serial.current;controller.current?.abort()},[]);
 function edit(changes:Partial<ReadingFilters>){++serial.current;controller.current?.abort();setLoading(false);setResult(null);setError('');setDraft(current=>({...current,...changes}));rolling.current=false}
 function submit(event:FormEvent){event.preventDefault();void query(draft)}
 function recent(){const recent=last24Hours(),filters={...draft,from:recent.from,to:recent.to};rolling.current=true;setDraft(filters);void query(filters)}
 const description=applied?`Período: ${dateLabel(applied.from+'-03:00')} até ${dateLabel(applied.to+'-03:00')} (fim exclusivo) · ${applied.plant_id?lookup.plant(applied.plant_id):'Todas as usinas'} · ${applied.unit_id?lookup.unit(applied.unit_id):'Todas as UGs'} · Pessoa: ${applied.person||'Todas'} · Observações: ${applied.search||'Todas'} · Horário de Brasília`:'';
 function printReport(){
  if(!groups.length)return;
  if(view==='charts'){window.print();return}
  const popup=window.open('','_blank');if(!popup){setError('Permita a abertura da janela de impressão para gerar o relatório completo.');return}
  popup.opener=null;popup.document.open();popup.document.write(readingPrintDocument(groups,description,dateLabel));popup.document.close();
  const button=popup.document.getElementById('print-report');if(button)button.onclick=()=>popup.print();popup.focus();
 }
 const pages=result?Math.max(1,Math.ceil(result.total/result.page_size)):1;
 return <div className={`cog-reading-workspace ${mode==='report'?'cog-reading-report-workspace':''}`}>
  <form onSubmit={submit} className="no-print"><div className="cog-filters cog-reading-query-fields">
   <label className="form-field"><span>Usina</span><select className="field-input" value={draft.plant_id} onChange={e=>edit({plant_id:e.target.value,unit_id:''})}><option value="">Todas as usinas</option>{plants.map(p=><option key={p.id} value={p.id}>{p.name}{p.active?'':' · inativa'}</option>)}</select></label>
   <label className="form-field"><span>Unidade geradora</span><select className="field-input" value={draft.unit_id} onChange={e=>edit({unit_id:e.target.value})}><option value="">Todas as UGs</option>{units.filter(u=>!draft.plant_id||u.plant_id===draft.plant_id).map(u=><option key={u.id} value={u.id}>{!draft.plant_id?lookup.plant(u.plant_id||'')+' · ':''}{u.name}{u.active?'':' · inativa'}</option>)}</select></label>
   <label className="form-field"><span>Início · Brasília</span><input className="field-input" type="datetime-local" step="1" required value={draft.from} onChange={e=>edit({from:e.target.value})}/></label>
   <label className="form-field"><span>Fim · Brasília</span><input className="field-input" type="datetime-local" step="1" required value={draft.to} onChange={e=>edit({to:e.target.value})}/></label>
   <label className="form-field"><span>Registrado por</span><input className="field-input" placeholder="Nome da pessoa" maxLength={120} value={draft.person} onChange={e=>edit({person:e.target.value})}/></label>
   <label className="form-field"><span>Observações</span><input className="field-input" placeholder="Buscar observações" maxLength={400} value={draft.search} onChange={e=>edit({search:e.target.value})}/></label>
  </div><div className="cog-reading-query-actions"><p>{mode==='list'?'Ao abrir esta aba, são consultadas somente as últimas 24 horas.':'Escolha o período e consulte para preparar os relatórios e gráficos.'} Alterações nos filtros são aplicadas ao consultar.</p><div><button type="button" className="btn" onClick={recent}><Clock3/>Últimas 24h</button><button className="btn btn-primary" type="submit" disabled={loading}><Search/>{loading?'Consultando…':'Consultar'}</button></div></div></form>
  {error&&<p className="error-box no-print" role="alert">{error}</p>}
  {loading?<div className="cog-empty" role="status">Consultando as leituras do período…</div>:!result?<div className="cog-empty">Clique em Consultar para carregar os registros do período escolhido.</div>:<>
   {mode==='report'&&<><div className="cog-reading-output-actions no-print"><div className="cog-reading-view-toggle" role="group" aria-label="Visualização do relatório"><button className={`btn ${view==='table'?'btn-primary':''}`} aria-pressed={view==='table'} onClick={()=>setView('table')}><Table2/>Relatórios</button><button className={`btn ${view==='charts'?'btn-primary':''}`} aria-pressed={view==='charts'} onClick={()=>setView('charts')}><Activity/>Gráficos</button></div><div className="heading-actions"><button className="btn" disabled={!result.total} onClick={printReport}><Printer/>{view==='charts'?'Imprimir gráficos / PDF':'Imprimir relatório completo / PDF'}</button><button className="btn btn-primary" disabled={!result.total} onClick={()=>onExport(readingLongCSV(groups,dateLabel),'Leituras-consolidado')}><Download/>CSV consolidado</button></div></div><div className="cog-report-title"><strong>VOLTS COG · Leituras manuais</strong><p>{description}</p><span>{result.total} leituras · {groups.length} relatórios por usina / UG / modelo</span></div></>}
   {!result.readings.length?<div className="cog-empty">Nenhuma leitura encontrada neste período e filtros.</div>:mode==='report'?view==='charts'?<Suspense fallback={<div className="cog-empty" role="status">Carregando gráficos…</div>}><ReadingCharts groups={groups}/></Suspense>:<ReadingReports key={JSON.stringify(applied)} groups={groups} onExport={group=>onExport(readingWideCSV(group,dateLabel),`Leituras-${group.plantName}-${group.unitName}`)}/>:<><p className="cog-reading-list-period">{description}</p><Table className="fleet-table"><TableHeader><TableRow>{['Data / hora','Usina / UG','Modelo de leitura','Medições','Registrado por','Detalhes'].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{result.readings.map(reading=><TableRow key={reading.id}><TableCell>{dateLabel(reading.occurred_at)}</TableCell><TableCell><strong>{readingNames(reading,lookup).plant}</strong><br/><span className="muted">{readingNames(reading,lookup).unit}</span></TableCell><TableCell>{readingProfileName(reading)}</TableCell><TableCell>{readingCount(reading)} preenchidas</TableCell><TableCell>{reading.author_name}</TableCell><TableCell><button className="btn btn-ghost" onClick={()=>onView(reading)}>Ver leitura<ArrowRight/></button></TableCell></TableRow>)}</TableBody></Table></>}
   {mode==='list'&&<div className="table-footer no-print"><span>{result.total} registros encontrados no período · até {result.page_size} por página</span>{pages>1&&<div><button className="btn btn-ghost" disabled={result.page<=1} onClick={()=>applied&&void query(applied,result.page-1)}>Anterior</button> {result.page} / {pages} <button className="btn btn-ghost" disabled={result.page>=pages} onClick={()=>applied&&void query(applied,result.page+1)}>Próxima</button></div>}</div>}
  </>}
 </div>;
}
