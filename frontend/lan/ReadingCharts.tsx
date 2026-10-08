import {useMemo,useState} from 'react';
import {Activity,ChartNoAxesCombined} from 'lucide-react';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Scatter,ScatterChart,Tooltip,XAxis,YAxis} from 'recharts';
import type {ReadingGroup} from './reading-utils';
import {CHART_POINT_LIMIT,chartDate,chartValue,correlationPoints,readingChartData,sampleChartPoints,type ReadingChartPoint,type ReadingCorrelationPoint,type TemperatureField} from './reading-chart-utils';
import './reading-charts.css';

const POWER_COLOR='#e7dc36',TEMPERATURE_COLORS=['#66d3de','#eea069','#bb9aed','#86ce8a'];
type ChartMode='power'|'temperature'|'correlation';
const modeNames:Record<ChartMode,string>={power:'Potência no tempo',temperature:'Temperaturas e potência',correlation:'Temperatura × potência'};
const emptyMessage='Não há leituras compatíveis com esta visualização no período consultado.';

function TimelineTooltip({active,payload,fields}:{active?:boolean;payload?:ReadonlyArray<{payload?:ReadingChartPoint}>;fields:TemperatureField[]}){
 const point=payload?.[0]?.payload;if(!active||!point)return null;
 return <div className="cog-chart-tooltip"><strong>{chartDate(point.time,true)} · Brasília</strong><p><i style={{background:POWER_COLOR}}/>Potência ativa: <b>{point.power===null?'Não informada':`${chartValue(point.power)} kW`}</b></p>{fields.map((field,index)=><p key={field.key}><i style={{background:TEMPERATURE_COLORS[index]}}/>{field.label}: <b>{point.temperatures[field.key]==null?'Não informada':`${chartValue(point.temperatures[field.key]!)} °C`}</b></p>)}</div>;
}

function CorrelationTooltip({active,payload,fields}:{active?:boolean;payload?:ReadonlyArray<{payload?:ReadingCorrelationPoint&{fieldLabel?:string}}>;fields:TemperatureField[]}){
 const point=payload?.[0]?.payload;if(!active||!point)return null;
 return <div className="cog-chart-tooltip"><strong>{chartDate(point.time,true)} · Brasília</strong><p>{point.fieldLabel||fields[0]?.label}: <b>{chartValue(point.temperature)} °C</b></p><p>Potência ativa: <b>{chartValue(point.power)} kW</b></p><small>Valores da mesma leitura.</small></div>;
}

function GroupChart({group}:{group:ReadingGroup}){
 const model=useMemo(()=>readingChartData(group),[group]);
 const confirmed=model.temperatures.filter(field=>field.confirmedUnit);
 const unconfirmed=model.temperatures.filter(field=>!field.confirmedUnit);
 const [mode,setMode]=useState<ChartMode>('power');
 const [temperatureKeys,setTemperatureKeys]=useState<string[]>(()=>confirmed.filter(field=>model.points.some(point=>point.temperatures[field.key]!==null)).slice(0,4).map(field=>field.key));
 const selected=confirmed.filter(field=>temperatureKeys.includes(field.key)).slice(0,4);
 const selectedKey=selected.map(field=>field.key).join('|');
 const points=useMemo(()=>sampleChartPoints(model.points,CHART_POINT_LIMIT,selectedKey?selectedKey.split('|'):[]),[model.points,selectedKey]);
 const sampled=points.length<model.points.length;
 const hasPower=model.points.some(point=>point.power!==null);
 const hasTemperatures=selected.some(field=>model.points.some(point=>point.temperatures[field.key]!==null));
 const pairs=useMemo(()=>selected.map(field=>{
  const all=correlationPoints(model.points,field.key);
  const sampledPairs=sampleChartPoints(all.map(point=>({id:point.id,time:point.time,power:point.power,temperatures:{[field.key]:point.temperature}})),CHART_POINT_LIMIT,[field.key]);
  return {field,total:all.length,data:correlationPoints(sampledPairs,field.key).map(point=>({...point,fieldLabel:field.label}))};
 }),[model.points,selectedKey]);
 const visible=mode==='power'?hasPower:mode==='temperature'?hasPower||hasTemperatures:pairs.some(pair=>pair.total>0);
 const anyPairsSampled=pairs.some(pair=>pair.data.length<pair.total);
 const visibleFields=mode==='power'?[]:selected;
 const totalPairs=pairs.reduce((count,pair)=>count+pair.total,0);
 const displayedPairs=pairs.reduce((count,pair)=>count+pair.data.length,0);
 const totalPower=model.points.filter(point=>point.power!==null).length;

 function toggleTemperature(key:string){setTemperatureKeys(keys=>keys.includes(key)?keys.filter(value=>value!==key):keys.length<4?[...keys,key]:keys);}
 return <section className="cog-reading-chart-group">
  <header className="cog-reading-chart-heading"><div><span className="cog-chart-eyebrow">ANÁLISE DE LEITURAS</span><h2>{group.plantName} <span>· {group.unitName}</span></h2><p>{group.profileName} · {group.readings.length.toLocaleString('pt-BR')} leituras consultadas</p></div><Activity aria-hidden="true"/></header>
  <div className="cog-chart-modes no-print" role="group" aria-label="Visualização do gráfico">{(Object.keys(modeNames) as ChartMode[]).map(value=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{modeNames[value]}</button>)}</div>
  {mode!=='power'&&<fieldset className="cog-chart-temperatures no-print"><legend>Temperaturas <small>selecione até 4</small></legend>{confirmed.length?<div>{confirmed.map(field=><label key={field.key}><input type="checkbox" checked={temperatureKeys.includes(field.key)} disabled={!temperatureKeys.includes(field.key)&&temperatureKeys.length>=4} onChange={()=>toggleTemperature(field.key)}/><span>{field.label} <small>°C</small></span></label>)}</div>:<p>Este modelo não possui campos com unidade °C informada.</p>}</fieldset>}
  <div className="cog-chart-meta"><h3>{modeNames[mode]}</h3><p>{mode==='correlation'?'Cada ponto combina temperatura e potência da mesma leitura.':'Horário de Brasília · os espaços nas linhas indicam valores não informados.'}</p></div>
  <div className="cog-chart-legend" aria-label="Séries do gráfico">{mode!=='correlation'&&<span><i style={{background:POWER_COLOR}}/>Potência ativa (kW)</span>}{visibleFields.map((field,index)=><span key={field.key}><i style={{background:TEMPERATURE_COLORS[index]}}/>{field.label} (°C)</span>)}</div>
  {!model.powerField&&<p className="cog-chart-notice">Este modelo não identifica um campo de potência ativa em kW. Os valores de outros campos não são convertidos em potência ativa.</p>}
  {mode!=='power'&&unconfirmed.length>0&&<p className="cog-chart-notice">Unidade não informada no modelo: {unconfirmed.map(field=>field.label).join(', ')}. Esses campos permanecem no relatório, fora do gráfico em °C.</p>}
  {mode!=='power'&&confirmed.length>0&&selected.length===0&&<p className="cog-chart-notice">Selecione uma temperatura para compará-la com a potência.</p>}
  {visible?<div className="cog-reading-chart-canvas" role="img" aria-label={`${modeNames[mode]} de ${group.plantName}, ${group.unitName}, ${group.profileName}. ${mode==='correlation'?totalPairs+' pares de valores da mesma leitura':totalPower+' leituras com potência ativa'}. Valores completos disponíveis no relatório e CSV.`}>
   <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={300} initialDimension={{width:800,height:330}} debounce={100}>
    {mode==='correlation'?<ScatterChart margin={{top:20,right:24,bottom:36,left:20}}>
     <CartesianGrid stroke="#435047" strokeDasharray="3 5"/>
     <XAxis type="number" dataKey="power" name="Potência ativa" unit=" kW" tickFormatter={chartValue} stroke="#9eaaa0" tick={{fontSize:11}} label={{value:'Potência ativa (kW)',position:'bottom',offset:15,fill:'#b9c4b6'}}/>
     <YAxis type="number" dataKey="temperature" name="Temperatura" unit=" °C" tickFormatter={chartValue} stroke="#9eaaa0" tick={{fontSize:11}} width={55} label={{value:'Temperatura (°C)',angle:-90,position:'insideLeft',offset:-10,fill:'#b9c4b6'}}/>
     <Tooltip cursor={{strokeDasharray:'3 3'}} isAnimationActive={false} content={({active,payload})=><CorrelationTooltip active={active} payload={payload} fields={selected}/>}/>
     {pairs.map((pair,index)=><Scatter key={pair.field.key} name={pair.field.label} data={pair.data} fill={TEMPERATURE_COLORS[index]} fillOpacity={0.85} isAnimationActive={false}/>)}
    </ScatterChart>:<LineChart data={points} margin={{top:20,right:mode==='temperature'?18:24,bottom:38,left:18}}>
     <CartesianGrid stroke="#435047" strokeDasharray="3 5"/>
     <XAxis type="number" dataKey="time" domain={points.length&&points[0].time===points[points.length-1].time?[points[0].time-1800000,points[0].time+1800000]:['dataMin','dataMax']} scale="time" tickFormatter={time=>chartDate(Number(time))} stroke="#9eaaa0" tick={{fontSize:11}} minTickGap={35} tickCount={5} label={{value:'Data e hora · Brasília',position:'bottom',offset:19,fill:'#b9c4b6'}}/>
     <YAxis yAxisId="power" tickFormatter={chartValue} stroke={POWER_COLOR} tick={{fontSize:11}} width={60} label={{value:'Potência ativa (kW)',angle:-90,position:'insideLeft',offset:-12,fill:POWER_COLOR}}/>
     {mode==='temperature'&&<YAxis yAxisId="temperature" orientation="right" tickFormatter={chartValue} stroke="#a5c4ce" tick={{fontSize:11}} width={55} label={{value:'Temperatura (°C)',angle:90,position:'insideRight',offset:-9,fill:'#a5c4ce'}}/>}
     <Tooltip isAnimationActive={false} filterNull={false} content={({active,payload})=><TimelineTooltip active={active} payload={payload} fields={visibleFields}/>}/>
     <Line className="cog-chart-power-series" yAxisId="power" type="linear" dataKey="power" name="Potência ativa" stroke={POWER_COLOR} strokeWidth={sampled?0:2} dot={sampled||totalPower<40?{r:3,strokeWidth:0,fill:POWER_COLOR}:false} activeDot={{r:5}} connectNulls={false} isAnimationActive={false}/>
     {visibleFields.map((field,index)=><Line key={field.key} yAxisId="temperature" type="linear" dataKey={(point:ReadingChartPoint)=>point.temperatures[field.key]} name={field.label} stroke={TEMPERATURE_COLORS[index]} strokeWidth={sampled?0:1.8} dot={sampled||model.points.filter(point=>point.temperatures[field.key]!==null).length<40?{r:3,strokeWidth:0,fill:TEMPERATURE_COLORS[index]}:false} activeDot={{r:5}} connectNulls={false} isAnimationActive={false}/>)}
    </LineChart>}
   </ResponsiveContainer>
  </div>:<div className="cog-chart-empty"><ChartNoAxesCombined aria-hidden="true"/><strong>{emptyMessage}</strong><p>{mode==='correlation'?'São necessários potência ativa em kW e temperatura em °C preenchidas na mesma leitura.':'Consulte outro período ou selecione um campo com valores registrados.'}</p></div>}
  <footer className="cog-chart-footnote">
   {mode==='correlation'?<p>{displayedPairs.toLocaleString('pt-BR')} pares exibidos de {totalPairs.toLocaleString('pt-BR')}.{anyPairsSampled&&` Limite de ${CHART_POINT_LIMIT} pontos por temperatura; amostra de leituras reais com extremos preservados, sem médias.`} Valores ausentes não formam pares. A comparação não indica relação de causa e efeito.</p>:<p>{points.length.toLocaleString('pt-BR')} leituras exibidas de {model.points.length.toLocaleString('pt-BR')} com data válida.{sampled?` Amostra de até ${CHART_POINT_LIMIT} leituras reais, com extremos preservados e sem médias. As linhas ficam ocultas para não unir intervalos omitidos.`:' Valores ausentes não são preenchidos.'}</p>}
   {model.invalidDates>0&&<p>{model.invalidDates} {model.invalidDates===1?'leitura com data inválida permanece':'leituras com data inválida permanecem'} no relatório, fora do gráfico.</p>}
   <p>A seleção de pontos afeta somente o gráfico. O relatório e o CSV mantêm todos os registros consultados.</p>
  </footer>
 </section>;
}

export default function ReadingCharts({groups}:{groups:ReadingGroup[]}){
 const [groupKey,setGroupKey]=useState('');
 const group=groups.find(item=>item.key===groupKey)||groups[0];
 if(!group)return <div className="cog-empty"><ChartNoAxesCombined/><strong>Nenhuma leitura para gerar gráficos.</strong><span>Defina os filtros e consulte um período com leituras.</span></div>;
 return <div className="cog-reading-charts"><label className="cog-chart-group-select no-print">Usina / UG / modelo<select className="field-input" value={group.key} onChange={event=>setGroupKey(event.target.value)}>{groups.map(item=><option key={item.key} value={item.key}>{item.plantName} · {item.unitName} · {item.profileName} ({item.readings.length} leituras)</option>)}</select><small>Cada gráfico utiliza uma única usina, UG e modelo de leitura.</small></label><GroupChart group={group} key={group.key}/></div>;
}
