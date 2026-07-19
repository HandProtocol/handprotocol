import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { CalendarDays, Handshake, Leaf, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import {
  coordinationApiConfigured, createProtocolNeed, createProtocolPotluck, createProtocolSupply,
  ensureProtocolParticipant, listProtocolRecords, requestProtocolMatch, transitionProtocolSupply,
  type ProtocolRecord,
} from './lib/coordinationApi'

type Props = { canWrite: boolean; memberName: string; notify: (message: string) => void; onAuthRequired: () => void }
type Tab = 'activity'|'need'|'supply'|'potluck'

function future(hours: number) {
  return new Date(Date.now()+hours*3_600_000).toISOString()
}

export function ProtocolBoard({ canWrite, memberName, notify, onAuthRequired }: Props) {
  const [tab,setTab] = useState<Tab>('activity')
  const [records,setRecords] = useState<{ needs: ProtocolRecord[]; supplies: ProtocolRecord[]; commitments: ProtocolRecord[]; events: ProtocolRecord[] }>({ needs: [],supplies: [],commitments: [],events: [] })
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')

  const refresh = async () => {
    if (!coordinationApiConfigured || !canWrite) return
    setBusy(true); setError('')
    try {
      await ensureProtocolParticipant(memberName)
      const [needs,supplies,commitments,events] = await Promise.all([
        listProtocolRecords('needs'),listProtocolRecords('supplies'),listProtocolRecords('commitments'),listProtocolRecords('events'),
      ])
      setRecords({ needs,supplies,commitments,events })
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Protocol records could not load') }
    finally { setBusy(false) }
  }

  useEffect(() => { void refresh() }, [canWrite])

  const guard = () => {
    if (!canWrite) { onAuthRequired(); return false }
    if (!coordinationApiConfigured) { setError('Set VITE_COORDINATION_API_URL after deploying the Coordination API.'); return false }
    return true
  }

  const submitNeed = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!guard()) return
    const data = new FormData(event.currentTarget); setBusy(true); setError('')
    try {
      const windowStart = future(1), windowEnd = future(Number(data.get('hours') ?? 5))
      const need = await createProtocolNeed({ lane: data.get('lane'),item_category:data.get('item'),item_description:data.get('description'),quantity:Number(data.get('quantity')),unit:data.get('unit'),substitutions:[],dietary_constraints:String(data.get('dietary')??'').split(',').map(v=>v.trim()).filter(Boolean),allergens:String(data.get('allergens')??'').split(',').map(v=>v.trim()).filter(Boolean),preparation_state:data.get('preparation'),urgency:Number(data.get('urgency')),required_by:windowEnd,window_start:windowStart,window_end:windowEnd,fulfillment_method:'pickup',service_zone:data.get('zone'),subsidy_eligible:data.get('lane')==='marketplace' })
      notify('Need verified and opened for matching'); setTab('activity'); await refresh(); await requestProtocolMatch(need.id)
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Need could not be created') }
    finally { setBusy(false) }
  }

  const submitSupply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!guard()) return
    const data = new FormData(event.currentTarget); const lane=String(data.get('lane')); setBusy(true); setError('')
    try {
      const supply=await createProtocolSupply({ lane,item_category:data.get('item'),item_description:data.get('description'),quantity:Number(data.get('quantity')),unit:data.get('unit'),origin:data.get('origin'),preparation_location:data.get('origin'),expires_at:future(Number(data.get('hours')??8)),preparation_class:data.get('preparation'),allergens:[],dietary_tags:[],temperature_class:'not_controlled',compliance_evidence:{},fulfillment_method:'pickup',service_zone:data.get('zone'),available_from:new Date().toISOString(),available_until:future(Number(data.get('hours')??8)),price_cents:lane==='marketplace'?Number(data.get('price')):null,tax_treatment:lane==='marketplace'?'provider_calculated':null,transport_responsibility:'pickup',maximum_delivery_radius_miles:0 })
      if(lane==='potluck'){await transitionProtocolSupply(supply.id,'verified');await transitionProtocolSupply(supply.id,'open');notify('Potluck contribution opened for matching')}else notify('Supply saved as a draft pending current source and safety evidence')
      setTab('activity');await refresh()
    } catch(problem){setError(problem instanceof Error?problem.message:'Supply could not be created')}
    finally{setBusy(false)}
  }

  const submitPotluck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if(!guard())return
    const data=new FormData(event.currentTarget);setBusy(true);setError('')
    try{await createProtocolPotluck({name:data.get('name'),purpose:data.get('purpose'),service_zone:data.get('zone'),starts_at:future(Number(data.get('hours')??72)),ends_at:future(Number(data.get('hours')??72)+3),capacity:Number(data.get('capacity')),dietary_profile:String(data.get('dietary')??'').split(',').map(v=>v.trim()).filter(Boolean),accessibility_needs:[],menu_items:[]});notify('Potluck sent to venue and contribution planning');setTab('activity');await refresh()}
    catch(problem){setError(problem instanceof Error?problem.message:'Potluck could not be created')}
    finally{setBusy(false)}
  }

  return <section className="protocol-board">
    <div className="protocol-intro panel"><div><p className="eyebrow"><ShieldCheck size={14}/> Policy-governed coordination</p><h2>One record across web, voice, and approved agents</h2><p>Needs, supplies, matches, commitments, payments, and potlucks use the same audited command layer. SMS remains in the next scope.</p></div><button className="protocol-refresh" onClick={()=>void refresh()} disabled={busy}><RefreshCw size={15}/> Refresh</button></div>
    <div className="protocol-tabs" role="tablist" aria-label="Coordination tools">{(['activity','need','supply','potluck'] as Tab[]).map(item=><button key={item} className={tab===item?'active':''} onClick={()=>setTab(item)}>{item==='activity'?'Network records':item==='need'?'Request food':item==='supply'?'Offer food':'Plan a potluck'}</button>)}</div>
    {error&&<div className="protocol-notice" role="alert">{error}</div>}
    {busy&&<p className="protocol-loading"><LoaderCircle size={16}/> Working through policy checks…</p>}
    {tab==='activity'&&<div className="protocol-record-grid">
      <ProtocolList icon={<Leaf size={17}/>} title="Needs" records={records.needs}/><ProtocolList icon={<Handshake size={17}/>} title="Supplies" records={records.supplies}/><ProtocolList icon={<ShieldCheck size={17}/>} title="Commitments" records={records.commitments}/><ProtocolList icon={<CalendarDays size={17}/>} title="Potlucks" records={records.events}/>
    </div>}
    {tab==='need'&&<ProtocolForm title="Create a structured need" onSubmit={submitNeed}><Lane/><Field name="item" label="Food item or category" required/><Field name="description" label="What is needed" required/><Quantity/><Field name="dietary" label="Dietary needs, comma separated"/><Field name="allergens" label="Allergens to avoid, comma separated"/><Field name="preparation" label="Preparation state" defaultValue="packaged" required/><Field name="zone" label="Austin service zone" defaultValue="78702" required/><Select name="urgency" label="Urgency" options={[['1','Routine'],['2','Soon'],['3','High'],['4','Urgent']]}/><Field name="hours" label="Needed within hours" type="number" defaultValue="5" required/><Submit busy={busy} label="Verify and open need"/></ProtocolForm>}
    {tab==='supply'&&<ProtocolForm title="Create a structured supply" onSubmit={submitSupply}><Lane/><Field name="item" label="Food item or category" required/><Field name="description" label="What is available" required/><Quantity/><Field name="origin" label="Source or preparation location" required/><Select name="preparation" label="Preparation class" options={[["whole","Whole or packaged"],["commercial_prepared","Commercially prepared"],["home_prepared","Home prepared, potluck only"]]}/><Field name="zone" label="Austin service zone" defaultValue="78702" required/><Field name="hours" label="Available for hours" type="number" defaultValue="8" required/><Field name="price" label="Marketplace unit price, cents" type="number" defaultValue="0"/><Submit busy={busy} label="Save supply"/></ProtocolForm>}
    {tab==='potluck'&&<ProtocolForm title="Propose a community potluck" onSubmit={submitPotluck}><Field name="name" label="Event name" required/><Field name="purpose" label="Purpose" required/><Field name="zone" label="Austin service zone" defaultValue="78702" required/><Field name="capacity" label="Capacity" type="number" defaultValue="12" required/><Field name="hours" label="Starts in hours" type="number" defaultValue="72" required/><Field name="dietary" label="Dietary profile, comma separated" defaultValue="plant_forward"/><Submit busy={busy} label="Start venue and menu planning"/></ProtocolForm>}
  </section>
}

function ProtocolList({icon,title,records}:{icon:ReactNode;title:string;records:ProtocolRecord[]}){return <article className="panel protocol-list"><h3>{icon}{title}<span>{records.length}</span></h3>{records.length===0?<p>No persisted records yet.</p>:records.slice(0,6).map(record=><div key={record.id}><strong>{record.item_description??record.name??record.id.slice(0,8)}</strong><span>{record.lane??'coordination'} · {record.fulfillment_state??record.status??'recorded'}</span></div>)}</article>}
function ProtocolForm({title,onSubmit,children}:{title:string;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;children:ReactNode}){return <form className="panel protocol-form" onSubmit={onSubmit}><h3>{title}</h3><div className="protocol-form-grid">{children}</div></form>}
function Field({name,label,type='text',defaultValue,required=false}:{name:string;label:string;type?:string;defaultValue?:string;required?:boolean}){return <label>{label}<input name={name} type={type} defaultValue={defaultValue} required={required}/></label>}
function Select({name,label,options}:{name:string;label:string;options:string[][]}){return <label>{label}<select name={name}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>}
function Lane(){return <Select name="lane" label="Lane" options={[["aid","Charitable aid"],["marketplace","Paid marketplace"],["potluck","Community potluck"]]}/>}
function Quantity(){return <><Field name="quantity" label="Quantity" type="number" defaultValue="1" required/><Field name="unit" label="Unit" defaultValue="lb" required/></>}
function Submit({busy,label}:{busy:boolean;label:string}){return <button className="protocol-submit" disabled={busy} type="submit">{label}</button>}
