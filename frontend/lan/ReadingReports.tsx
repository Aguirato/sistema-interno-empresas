import {useMemo,useState} from 'react';
import {Download} from 'lucide-react';
import {dateLabel} from '@/lib/fleet';
import {readingValue,type ReadingGroup} from './reading-utils';

export default function ReadingReports({groups,onExport}:{groups:ReadingGroup[];onExport:(group:ReadingGroup)=>void}){
 const [selected,setSelected]=useState(''),[page,setPage]=useState(1);
 const group=useMemo(()=>groups.find(g=>g.key===selected)||groups[0],[groups,selected]);
 if(!group)return null;
 const pages=Math.max(1,Math.ceil(group.readings.length/4)),current=Math.min(page,pages),offset=(current-1)*4,batch=group.readings.slice(offset,offset+4);
 return <div className="cog-reading-reports"><div className="cog-reading-report-controls no-print"><label className="form-field"><span>Relatório da usina / UG / modelo</span><select className="field-input" value={group.key} onChange={e=>{setSelected(e.target.value);setPage(1)}}>{groups.map(g=><option key={g.key} value={g.key}>{g.plantName} · {g.unitName} · {g.profileName} ({g.readings.length})</option>)}</select></label></div><section className="cog-reading-report-group" key={group.key}>
  <div className="cog-reading-report-heading no-print"><div><h2>{group.plantName} <span>· {group.unitName}</span></h2><p>{group.profileName} · {group.readings.length} {group.readings.length===1?'leitura':'leituras'} · {group.fields.length} campos</p></div><button className="btn" onClick={()=>onExport(group)} aria-label={`Exportar CSV de ${group.plantName}, ${group.unitName}, ${group.profileName}`}><Download/>CSV desta UG</button></div>
  <div className="cog-reading-report-page" key={batch[0]?.id}>
   <div className="cog-reading-table-scroll"><table className="cog-reading-matrix"><colgroup><col style={{width:'32%'}}/>{batch.map(reading=><col key={reading.id} style={{width:`${68/batch.length}%`}}/>)}</colgroup>
    <thead><tr className="cog-reading-matrix-title"><th colSpan={batch.length+1}><strong>{group.plantName} · {group.unitName}</strong><span>{group.profileName} · Leituras {offset+1}–{offset+batch.length} de {group.readings.length}</span>{group.sourceNote&&<span>{group.sourceNote}</span>}</th></tr><tr><th scope="col">Medição / unidade</th>{batch.map(reading=><th scope="col" key={reading.id}><time>{dateLabel(reading.occurred_at)}</time><span>{reading.author_name}</span></th>)}</tr></thead>
    <tbody>{group.fields.map(field=><tr key={field.key}><th scope="row">{field.label}{field.unit&&<span className="cog-reading-field-unit">{field.unit}</span>}</th>{batch.map(reading=><td key={reading.id}>{readingValue(reading.values?.[field.key])}</td>)}</tr>)}<tr className="cog-reading-notes"><th scope="row">Observações</th>{batch.map(reading=><td key={reading.id}>{reading.notes||'—'}</td>)}</tr></tbody>
   </table></div>
  </div><div className="table-footer no-print"><span>Folha {current} de {pages} · até 4 leituras por folha</span><div><button className="btn btn-ghost" disabled={current<=1} onClick={()=>setPage(current-1)}>Anterior</button><button className="btn btn-ghost" disabled={current>=pages} onClick={()=>setPage(current+1)}>Próxima</button></div></div>
 </section></div>;
}
