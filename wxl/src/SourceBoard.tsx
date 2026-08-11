import { useState } from 'react'
import { CheckCircle2, Plus, Warehouse } from 'lucide-react'
import { nominateFoodSource } from './lib/foodRepository'

export function SourceBoard({ notify, dbConfigured, canWrite, verifiedCount, onAuthRequired }: { notify: (message: string) => void; dbConfigured: boolean; canWrite: boolean; verifiedCount: number; onAuthRequired: () => void }) {
  const [sourceName, setSourceName] = useState('')
  const [sourceType, setSourceType] = useState('Food pantry')
  const [neighborhood, setNeighborhood] = useState('East Austin')
  const [notes, setNotes] = useState('')
  const [nominated, setNominated] = useState<string[]>([])

  const submitNomination = () => {
    if (!sourceName.trim() || !notes.trim()) return
    if (!canWrite) { onAuthRequired(); return }
    const input = { source_name: sourceName.trim(), source_type: sourceType, neighborhood, notes: notes.trim() }
    if (dbConfigured) {
      nominateFoodSource(input).then(({ error }) => {
        if (error) { notify(error.message); return }
        setNominated((current) => [sourceName.trim(), ...current])
        setSourceName(''); setNotes(''); notify('Food source nomination sent for review')
      })
    } else {
      setNominated((current) => [sourceName.trim(), ...current])
      setSourceName(''); setNotes(''); notify('Food source nomination added to the review queue')
    }
  }

  return <><section className="community-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Community-vetted source registry</p><h2>Partner network</h2><p>Nominate a local food source. WXL:FOOD reviews it before it becomes part of the public map.</p></div><div className="source-count"><strong>{verifiedCount}</strong><span>verified {verifiedCount === 1 ? 'source' : 'sources'} on the map</span></div></section><section className="source-layout"><div className="panel source-intro"><div className="source-illustration"><Warehouse size={28} /><span /><span /><span /></div><p className="eyebrow">How the registry works</p><h2>People closest to the work keep the map honest.</h2><p>Anyone in the network can nominate a pantry, fridge, farm, kitchen, church, school program, market, or mutual-aid group. A coordinator confirms the source, its hours, and what it can actually offer.</p><div className="source-steps"><div><b>01</b><span>Nominate a source</span></div><div><b>02</b><span>Verify the details</span></div><div><b>03</b><span>Connect it to requests</span></div></div></div><div className="panel nomination-form"><p className="eyebrow">Add to the network</p><h2>Nominate a food source</h2><label>Organization or place<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Eastside Community Fridge" /></label><label>Source type<select value={sourceType} onChange={(event) => setSourceType(event.target.value)}><option>Food pantry</option><option>Community refrigerator</option><option>Farm or garden</option><option>Community kitchen</option><option>Restaurant or bakery</option><option>Mutual-aid group</option><option>School or university program</option></select></label><label>Neighborhood<select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}><option>East Austin</option><option>Rosewood</option><option>Govalle</option><option>South Lamar</option><option>East Cesar Chavez</option></select></label><label>What should we know?<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Share what they provide, when they are open, and who to contact..." rows={4} /></label><button className="add-button" onClick={submitNomination} disabled={!sourceName.trim() || !notes.trim()}><Plus size={16} /> Submit nomination</button>{nominated.length > 0 && <p className="nomination-success"><CheckCircle2 size={14} /> {nominated[0]} is in the review queue.</p>}</div></section></>
}
