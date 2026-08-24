import { useEffect, useState } from 'react'
import { ArrowUp, ArrowUpRight, HandHeart, MessageCircle, Package, Plus, Send, ShieldCheck, X } from 'lucide-react'
import { addFoodRequestMessage, changeFoodRequestStatus, createFoodRequest, createFoodRequestOffer, decideFoodRequestOffer, loadFoodRequestMessages, loadFoodRequestOffers, supportFoodRequest, withdrawFoodRequestOffer, type FoodRequestMessageRecord, type FoodRequestOfferRecord } from './lib/foodRepository'
import { useDialogMotion } from './useDialogMotion'
import { initialMessages, type FoodRequest } from './sampleData'

export function CommunityBoard({ requests, setRequests, notify, dbConfigured, canWrite, memberId, memberName, onAuthRequired, initialCreate = false }: { requests: FoodRequest[]; setRequests: React.Dispatch<React.SetStateAction<FoodRequest[]>>; notify: (message: string) => void; dbConfigured: boolean; canWrite: boolean; memberId: string | null; memberName: string; onAuthRequired: () => void; initialCreate?: boolean }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'urgent'>('all')
  const [selectedId, setSelectedId] = useState<FoodRequest['id']>(() => requests[0]?.id ?? '')
  const [messages, setMessages] = useState<FoodRequestMessageRecord[]>([])
  const [offers, setOffers] = useState<FoodRequestOfferRecord[]>([])
  const [activityState, setActivityState] = useState<'sample' | 'loading' | 'ready' | 'error'>('sample')
  const [activityVersion, setActivityVersion] = useState(0)
  const [message, setMessage] = useState('')
  const [showCreate, setShowCreate] = useState(initialCreate)
  const [showOffer, setShowOffer] = useState(false)
  const createDialogMotion = useDialogMotion(() => setShowCreate(false), showCreate)
  const offerDialogMotion = useDialogMotion(() => setShowOffer(false), showOffer)
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState(initialCreate ? 'Neighborhood community table' : '')
  const [newGroup, setNewGroup] = useState(`${memberName}'s group`)
  const [newDetail, setNewDetail] = useState(initialCreate ? 'We are planning a shared meal and looking for food, setup help, and neighbors who want to join.' : '')
  const [newNeighborhood, setNewNeighborhood] = useState('East Austin')
  const [newCategory, setNewCategory] = useState<'resource_request' | 'help_needed' | 'storage_request' | 'transport_request'>('resource_request')
  const [newPriority, setNewPriority] = useState<FoodRequest['priority']>('medium')
  const [offerType, setOfferType] = useState<FoodRequestOfferRecord['offer_type']>('food')
  const [offerItem, setOfferItem] = useState('')
  const [offerQuantity, setOfferQuantity] = useState('')
  const [offerUnit, setOfferUnit] = useState('lb')
  const [offerAvailability, setOfferAvailability] = useState('')
  const [offerTransport, setOfferTransport] = useState(false)
  const [offerContact, setOfferContact] = useState<FoodRequestOfferRecord['contact_preference']>('in_app')

  const selectedRequest: FoodRequest | undefined = requests.find((request) => request.id === selectedId) ?? requests[0]
  const selectedIsPersisted = dbConfigured && typeof selectedRequest?.id === 'string'
  const ownsSelectedRequest = Boolean(memberId && selectedRequest?.createdBy === memberId)
  const visibleRequests = requests.filter((request) => filter === 'all' || (filter === 'urgent' ? request.priority === 'urgent' : request.status === 'open'))

  useEffect(() => {
    let current = true
    if (!selectedIsPersisted || !selectedRequest) {
      setMessages([])
      setOffers([])
      setActivityState('sample')
      return () => { current = false }
    }
    setActivityState('loading')
    setMessages([])
    setOffers([])
    void Promise.all([loadFoodRequestMessages(String(selectedRequest.id)), loadFoodRequestOffers(String(selectedRequest.id))]).then(([messageResult, offerResult]) => {
      if (!current) return
      if (messageResult.error || offerResult.error) {
        setActivityState('error')
        return
      }
      setMessages(messageResult.data ?? [])
      setOffers(offerResult.data ?? [])
      setActivityState('ready')
    })
    return () => { current = false }
  }, [activityVersion, selectedIsPersisted, selectedRequest?.id])

  useEffect(() => {
    if (!newGroup || newGroup.endsWith("'s group")) setNewGroup(`${memberName}'s group`)
  }, [memberName])

  const sendMessage = async () => {
    if (!message.trim()) return
    if (!canWrite) { onAuthRequired(); return }
    if (!selectedIsPersisted || !selectedRequest) { notify('Sample request replies are not persisted'); return }
    setBusy(true)
    const result = await addFoodRequestMessage({ request_id: String(selectedRequest.id), message: message.trim(), author_name: memberName, author_role: 'Community member' })
    setBusy(false)
    if (result.error || !result.data) { notify(result.error?.message ?? 'The reply could not be saved'); return }
    setMessages((current) => [...current, result.data!])
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, responses: request.responses + 1 } : request))
    setMessage('')
    notify('Your response was saved')
  }

  const supportRequest = async () => {
    if (!canWrite) { onAuthRequired(); return }
    if (!selectedIsPersisted || !selectedRequest) { notify('Sample request support is not persisted'); return }
    setBusy(true)
    const { data, error } = await supportFoodRequest(String(selectedRequest.id))
    setBusy(false)
    if (error) { notify(error.message); return }
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, supporters: data?.supporters_count ?? request.supporters } : request))
    notify('Your support is recorded')
  }

  const submitOffer = async () => {
    if (!offerItem.trim() || !offerAvailability.trim() || (offerQuantity && !offerUnit.trim())) return
    if (!canWrite) { onAuthRequired(); return }
    if (!selectedIsPersisted || !selectedRequest) { notify('Sample request offers are not persisted'); return }
    setBusy(true)
    const { data, error } = await createFoodRequestOffer({
      request_id: String(selectedRequest.id),
      offer_type: offerType,
      item_description: offerItem.trim(),
      quantity: offerQuantity ? Number(offerQuantity) : undefined,
      unit: offerQuantity ? offerUnit.trim() : undefined,
      availability: offerAvailability.trim(),
      can_transport: offerTransport,
      contact_preference: offerContact,
    })
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The offer could not be saved'); return }
    setOffers((current) => [...current, data])
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, offers: request.offers + 1 } : request))
    offerDialogMotion.requestClose(() => {
      setShowOffer(false)
      setOfferItem('')
      setOfferQuantity('')
      setOfferAvailability('')
      setOfferTransport(false)
    })
    notify('Your offer was sent to the coordinating group')
  }

  const decideOffer = async (offerId: string, decision: 'accepted' | 'declined') => {
    if (!selectedRequest) return
    setBusy(true)
    const { data, error } = await decideFoodRequestOffer(offerId, decision)
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The offer decision could not be saved'); return }
    setOffers((current) => current.map((offer) => offer.id === offerId ? data : offer))
    if (decision === 'accepted' && selectedRequest.status === 'open') {
      setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, status: 'in progress' } : request))
    }
    notify(`Offer ${decision}`)
  }

  const withdrawOffer = async (offerId: string) => {
    if (!selectedRequest) return
    setBusy(true)
    const { error } = await withdrawFoodRequestOffer(offerId)
    setBusy(false)
    if (error) { notify(error.message); return }
    setOffers((current) => current.filter((offer) => offer.id !== offerId))
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, offers: Math.max(0, request.offers - 1) } : request))
    notify('Offer withdrawn')
  }

  const updateStatus = async (status: 'open' | 'in_progress' | 'fulfilled' | 'closed') => {
    if (!selectedIsPersisted || !selectedRequest) return
    setBusy(true)
    const { data, error } = await changeFoodRequestStatus(String(selectedRequest.id), status)
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The request status could not be changed'); return }
    const displayStatus: FoodRequest['status'] = data.status === 'in_progress' ? 'in progress' : data.status
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, status: displayStatus } : request))
    notify(`Request marked ${displayStatus}`)
  }

  const createRequest = async () => {
    if (!newTitle.trim() || !newGroup.trim() || !newDetail.trim()) return
    if (!canWrite) { onAuthRequired(); return }
    if (!dbConfigured) { notify('Connect yuhm to its database before posting'); return }
    setBusy(true)
    const { data, error } = await createFoodRequest({ title: newTitle.trim(), group_name: newGroup.trim(), neighborhood: newNeighborhood, category: newCategory, detail: newDetail.trim(), priority: newPriority })
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The request could not be saved'); return }
    const categoryLabel = newCategory === 'help_needed' ? 'Help needed' : newCategory === 'storage_request' ? 'Storage request' : newCategory === 'transport_request' ? 'Transport request' : 'Resource request'
    const next: FoodRequest = { id: data.id, title: data.title, group: data.group_name, neighborhood: data.neighborhood, category: categoryLabel, detail: data.detail, priority: data.priority, status: 'open', responses: 0, supporters: 0, offers: 0, createdBy: data.created_by, time: 'just now' }
    setRequests((current) => [next, ...current])
    setSelectedId(next.id)
    createDialogMotion.requestClose(() => {
      setShowCreate(false)
      setNewTitle('')
      setNewDetail('')
    })
    notify('Community request posted')
  }

  return <>
    <section className="community-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Shared neighborhood signal</p><h2>Community requests</h2><p>Groups can ask for food, storage, transport, or hands. Public replies and structured offers stay attached to the request.</p></div><button className="add-button" onClick={() => canWrite ? setShowCreate(true) : onAuthRequired()}><Plus size={17} /> New request</button></section>
    <section className="community-layout">
      <div className="panel request-list"><div className="request-list-top"><div><p className="eyebrow">Community request board</p><h2>{requests.filter((request) => request.status !== 'fulfilled' && request.status !== 'closed').length} active requests</h2></div><div className="request-filters">{(['all', 'open', 'urgent'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : item === 'open' ? 'Open' : 'Urgent'}</button>)}</div></div><div className="request-cards">{visibleRequests.map((request) => <button className={`request-card ${selectedRequest?.id === request.id ? 'selected' : ''}`} key={request.id} onClick={() => setSelectedId(request.id)}><div className="request-card-top"><div className={`request-type ${request.category === 'Help needed' ? 'peach' : 'blue'}`}>{request.category === 'Help needed' ? <HandHeart size={15} /> : <Package size={15} />}</div><div className="request-card-title"><strong>{request.title}</strong><span>{request.group} · {request.neighborhood}</span></div><span className={`priority ${request.priority}`}>{request.priority}</span></div><p>{request.detail}</p><div className="request-card-foot"><span className={`request-status ${request.status.replace(' ', '-')}`}><i /> {request.status}</span><span title="Replies"><MessageCircle size={13} /> {request.responses}</span><span title="Offers"><HandHeart size={13} /> {request.offers}</span><span title="Supporters"><ArrowUp size={13} /> {request.supporters}</span><span className="request-time">{request.time}</span></div></button>)}{visibleRequests.length === 0 && <div className="empty-state">No requests match this filter.</div>}</div></div>
      {selectedRequest ? <aside className="panel dialogue-panel">
        <div className="dialogue-heading"><div><p className="eyebrow">Request coordination</p><h2>{selectedRequest.title}</h2></div>{ownsSelectedRequest && <span className="owner-badge"><ShieldCheck size={13} /> Your request</span>}</div>
        <div className="dialogue-meta"><span className="signal-pill volunteers"><i /> {selectedRequest.status}</span><span>{selectedRequest.group}</span><span>{selectedRequest.neighborhood}</span></div>
        <div className="dialogue-summary"><Package size={16} /><span>{selectedRequest.detail}</span></div>
        {ownsSelectedRequest && <div className="request-manage" aria-label="Request status actions">{selectedRequest.status === 'open' && <button disabled={busy} onClick={() => void updateStatus('in_progress')}>Start coordinating</button>}{selectedRequest.status === 'in progress' && <button disabled={busy} onClick={() => void updateStatus('fulfilled')}>Mark fulfilled</button>}{(selectedRequest.status === 'fulfilled' || selectedRequest.status === 'closed') && <button disabled={busy} onClick={() => void updateStatus('open')}>Reopen request</button>}{selectedRequest.status !== 'closed' && <button disabled={busy} onClick={() => void updateStatus('closed')}>Close</button>}</div>}
        <div className="activity-section"><div className="activity-heading"><h3>Offers</h3><span>{selectedIsPersisted ? `${offers.length} current` : 'Sample request'}</span></div>{activityState === 'loading' && <p className="activity-state" role="status">Loading request activity…</p>}{activityState === 'error' && <div className="activity-state error">Request activity could not be loaded.<button onClick={() => setActivityVersion((current) => current + 1)}>Retry</button></div>}{activityState === 'sample' && <p className="activity-state">Offers on sample requests are illustrative and cannot be acted on.</p>}{activityState === 'ready' && offers.length === 0 && <p className="activity-state">No offers yet. Be the first to offer food, transport, storage, or volunteer time.</p>}{offers.map((offer) => <div className="structured-offer" key={offer.id}><div className="offer-title"><span>{offer.offer_type}</span><strong>{offer.item_description}</strong><em className={`offer-status ${offer.status}`}>{offer.status}</em></div><p>{offer.quantity ? `${offer.quantity} ${offer.unit} · ` : ''}{offer.availability}</p><small>{offer.can_transport ? 'Transport included' : 'Transport not included'} · {offer.contact_preference === 'email' ? 'Email follow-up requested' : 'Continue in public yuhm messages'}</small>{offer.status === 'proposed' && ownsSelectedRequest && <div className="offer-decision"><button disabled={busy} onClick={() => void decideOffer(offer.id, 'accepted')}>Accept</button><button disabled={busy} onClick={() => void decideOffer(offer.id, 'declined')}>Decline</button></div>}{offer.status === 'proposed' && offer.created_by === memberId && <button className="withdraw-offer" disabled={busy} onClick={() => void withdrawOffer(offer.id)}>Withdraw your offer</button>}</div>)}</div>
        <div className="offer-actions"><button disabled={busy} onClick={() => void supportRequest()}><ArrowUp size={14} /> Support request</button><button disabled={busy} onClick={() => canWrite ? selectedIsPersisted ? setShowOffer(true) : notify('Sample request offers are not persisted') : onAuthRequired()}><HandHeart size={14} /> Offer food or help</button></div>
        <div className="activity-section conversation-section"><div className="activity-heading"><h3>Public conversation</h3><span>{selectedIsPersisted ? `${messages.length} replies` : 'Sample dialogue'}</span></div><div className="conversation">{activityState === 'ready' && messages.length === 0 && <p className="activity-state">No replies yet.</p>}{activityState === 'sample' && initialMessages.map((item) => <MessageItem key={item.id} author={item.author} role={item.role} message={item.message} time={item.time} mine={item.mine} />)}{messages.map((item) => <MessageItem key={item.id} author={item.author_name} role={item.author_role ?? 'Community member'} message={item.message} time={new Date(item.created_at).toLocaleString()} mine={item.created_by === memberId} />)}</div></div>
        <div className="message-compose"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share a public coordination update..." rows={2} /><button disabled={busy || !message.trim()} onClick={() => void sendMessage()} aria-label="Send response"><Send size={16} /></button></div><p className="dialogue-note"><ShieldCheck size={13} /> Replies and offer details are public. Do not include private addresses, phone numbers, household names, or sensitive information.</p>
      </aside> : <aside className="panel dialogue-panel"><div className="empty-state">No community requests yet. Post the first request to start coordinating.</div></aside>}
    </section>
    {showCreate && <div className="modal-backdrop" data-dialog-state={createDialogMotion.state} onTransitionEnd={createDialogMotion.onTransitionEnd} onClick={() => createDialogMotion.requestClose()}><div className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-request-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Ask the network</p><h2 id="create-request-title">Post a community request</h2></div><button onClick={() => createDialogMotion.requestClose()} aria-label="Close request form"><X size={18} /></button></div><label>Coordinating group<input value={newGroup} onChange={(event) => setNewGroup(event.target.value)} placeholder="Your group or project name" /></label><label>What does your group need?<input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="For example, 25 lb of greens for Thursday dinner" /></label><div className="form-row"><label>Request type<select value={newCategory} onChange={(event) => setNewCategory(event.target.value as typeof newCategory)}><option value="resource_request">Food or supplies</option><option value="help_needed">Volunteer help</option><option value="storage_request">Storage</option><option value="transport_request">Transportation</option></select></label><label>Priority<select value={newPriority} onChange={(event) => setNewPriority(event.target.value as FoodRequest['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></div><label>Neighborhood<select value={newNeighborhood} onChange={(event) => setNewNeighborhood(event.target.value)}><option>East Austin</option><option>Rosewood</option><option>Govalle</option><option>South Lamar</option><option>East Cesar Chavez</option></select></label><label>Public context<textarea value={newDetail} onChange={(event) => setNewDetail(event.target.value)} placeholder="Share quantity, timing, storage, or pickup needs. Do not add a private address or household details." rows={4} /></label><p className="form-privacy"><ShieldCheck size={14} /> This request and its conversation are public.</p><div className="modal-actions"><button className="cancel-button" onClick={() => createDialogMotion.requestClose()}>Cancel</button><button className="add-button" onClick={() => void createRequest()} disabled={busy || !newTitle.trim() || !newGroup.trim() || !newDetail.trim()}>{busy ? 'Posting…' : 'Post request'} <ArrowUpRight size={15} /></button></div></div></div>}
    {showOffer && selectedRequest && <div className="modal-backdrop" data-dialog-state={offerDialogMotion.state} onTransitionEnd={offerDialogMotion.onTransitionEnd} onClick={() => offerDialogMotion.requestClose()}><div className="create-modal offer-modal" role="dialog" aria-modal="true" aria-labelledby="offer-request-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Make a concrete offer</p><h2 id="offer-request-title">Offer food or help</h2></div><button onClick={() => offerDialogMotion.requestClose()} aria-label="Close offer form"><X size={18} /></button></div><p className="modal-context">For {selectedRequest.title}</p><label>Offer type<select value={offerType} onChange={(event) => setOfferType(event.target.value as FoodRequestOfferRecord['offer_type'])}><option value="food">Food</option><option value="transport">Transportation</option><option value="storage">Storage</option><option value="volunteer">Volunteer time</option></select></label><label>What can you offer?<textarea value={offerItem} onChange={(event) => setOfferItem(event.target.value)} placeholder="Describe the food, vehicle, storage, or help you can provide" rows={3} /></label><div className="form-row"><label>Quantity, optional<input type="number" min="0.01" step="any" value={offerQuantity} onChange={(event) => setOfferQuantity(event.target.value)} placeholder="25" /></label><label>Unit{offerQuantity ? '' : ', optional'}<input value={offerUnit} onChange={(event) => setOfferUnit(event.target.value)} placeholder="lb, boxes, hours" /></label></div><label>Availability<input value={offerAvailability} onChange={(event) => setOfferAvailability(event.target.value)} placeholder="Thursday from 3 to 6 PM" /></label><label className="checkbox-label"><input type="checkbox" checked={offerTransport} onChange={(event) => setOfferTransport(event.target.checked)} /> I can transport this offer</label><label>Contact preference<select value={offerContact} onChange={(event) => setOfferContact(event.target.value as FoodRequestOfferRecord['contact_preference'])}><option value="in_app">Continue in public yuhm messages</option><option value="email">Request email follow-up</option></select></label><p className="form-privacy"><ShieldCheck size={14} /> Offer details are public. Your email address is not shown or exchanged by this board.</p><div className="modal-actions"><button className="cancel-button" onClick={() => offerDialogMotion.requestClose()}>Cancel</button><button className="add-button" onClick={() => void submitOffer()} disabled={busy || !offerItem.trim() || !offerAvailability.trim() || Boolean(offerQuantity && !offerUnit.trim())}>{busy ? 'Sending…' : 'Send offer'} <ArrowUpRight size={15} /></button></div></div></div>}
  </>
}

export function MessageItem({ author, role, message, time, mine }: { author: string; role: string; message: string; time: string; mine: boolean }) {
  const initials = author.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <div className={`message ${mine ? 'mine' : ''}`}><div className="message-avatar">{initials || 'WX'}</div><div className="message-body"><div className="message-author"><strong>{author}</strong><span>{role}</span><time>{time}</time></div><p>{message}</p></div></div>
}
