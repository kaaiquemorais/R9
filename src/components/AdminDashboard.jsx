import { useState, useMemo, useEffect } from 'react'
import { X, Check, XCircle, RefreshCw, Calendar, User, Clock, Scissors, Download } from 'lucide-react'
import { format, isToday, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getBookedSlots, cancelBooking, updateBookingStatus } from '../utils/calendar'
import { TIME_SLOTS } from '../data/services'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'vet997'
const O = 'rgba(255,106,0,'
const c = (a) => `${O}${a})`

function exportCSV(bookings, label) {
  const rows = [['Nome','Telefone','Serviço','Preço','Data','Hora','Status']]
  bookings.forEach(b => rows.push([b.clientName||'',b.clientPhone||'',b.service?.name||'',b.service?.priceDisplay||'',b.dateStr||'',b.time||'',b.status||'confirmado']))
  const csv = rows.map(r => r.map(v=>`"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`r9-${label}.csv`; a.click(); URL.revokeObjectURL(url)
  toast.success('Relatório exportado!')
}

/* ── Corner bracket decoration ── */
function Bracket({ size = 10, color = '#FF6A00', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={style}>
      <path d="M0 10 L0 0 L10 0" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

function HudCard({ children, className = '', style = {}, accent = false }) {
  return (
    <div className={`relative ${className}`} style={{ background: accent ? c('0.04') : 'rgba(255,255,255,0.02)', border: `1px solid ${accent ? c('0.25') : 'rgba(255,255,255,0.07)'}`, borderRadius: 4, ...style }}>
      <Bracket style={{ position:'absolute', top:-1, left:-1 }} color={accent ? '#FF6A00' : 'rgba(255,255,255,0.2)'} />
      <Bracket style={{ position:'absolute', top:-1, right:-1, transform:'scaleX(-1)' }} color={accent ? '#FF6A00' : 'rgba(255,255,255,0.2)'} />
      <Bracket style={{ position:'absolute', bottom:-1, left:-1, transform:'scaleY(-1)' }} color={accent ? '#FF6A00' : 'rgba(255,255,255,0.2)'} />
      <Bracket style={{ position:'absolute', bottom:-1, right:-1, transform:'scale(-1)' }} color={accent ? '#FF6A00' : 'rgba(255,255,255,0.2)'} />
      {children}
    </div>
  )
}

/* ── Blinking cursor ── */
function Cursor() {
  const [vis, setVis] = useState(true)
  useEffect(() => { const t = setInterval(()=>setVis(v=>!v),530); return ()=>clearInterval(t) },[])
  return <span style={{ display:'inline-block', width:2, height:'1em', background: vis ? '#FF6A00' : 'transparent', marginLeft:3, verticalAlign:'middle', borderRadius:1 }} />
}

export default function AdminDashboard({ isOpen, onClose }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('agenda')
  const [filter, setFilter] = useState('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rescheduleId, setRescheduleId] = useState(null)
  const [bootText, setBootText] = useState('')

  /* boot animation on open */
  useEffect(() => {
    if (isOpen && !authenticated) {
      const msg = 'SISTEMA R9 // ACESSO RESTRITO'
      let i = 0
      setBootText('')
      const t = setInterval(() => { i++; setBootText(msg.slice(0,i)); if(i>=msg.length) clearInterval(t) }, 45)
      return () => clearInterval(t)
    }
  }, [isOpen])

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) { setAuthenticated(true); setBookings(getBookedSlots()) }
    else { setPwError(true); setPassword(''); setTimeout(()=>setPwError(false),1500) }
  }

  const handleRefresh = () => { setBookings(getBookedSlots()); toast.success('Dados sincronizados') }
  const handleCancel = (id) => { cancelBooking(id); setBookings(getBookedSlots()); toast.success('Cancelado') }
  const handleConfirm = (id) => { updateBookingStatus(id,'confirmed'); setBookings(getBookedSlots()); toast.success('Confirmado') }
  const handleReschedule = (id, newTime) => {
    const updated = bookings.map(b => b.id===id ? {...b,time:newTime} : b)
    localStorage.setItem('r9_bookings', JSON.stringify(updated))
    setBookings(updated); setRescheduleId(null); toast.success('Reagendado')
  }

  if (!isOpen) return null

  const todayBookings = bookings.filter(b=>{try{return isToday(parseISO(b.dateStr))}catch{return false}})
  const activeBookings = bookings.filter(b=>b.status!=='cancelled')
  const cancelledCount = bookings.filter(b=>b.status==='cancelled').length
  const totalRevenue = activeBookings.reduce((a,b)=>a+(b.service?.price||0),0)
  const todayRevenue = todayBookings.filter(b=>b.status!=='cancelled').reduce((a,b)=>a+(b.service?.price||0),0)
  const bookedTodayTimes = todayBookings.map(b=>b.time)
  const availableToday = TIME_SLOTS.filter(t=>!bookedTodayTimes.includes(t))
  const serviceBreakdown = activeBookings.reduce((acc,b)=>{ const n=b.service?.name||'Outro'; acc[n]=(acc[n]||0)+1; return acc },{})

  const filteredBookings = useMemo(()=>bookings.filter(b=>{
    if(filter==='today'){try{return isToday(parseISO(b.dateStr))}catch{return false}}
    if(filter==='active') return b.status!=='cancelled'
    if(filter==='cancelled') return b.status==='cancelled'
    if(filter==='range'&&dateFrom&&dateTo){try{const d=parseISO(b.dateStr);return isWithinInterval(d,{start:startOfDay(parseISO(dateFrom)),end:endOfDay(parseISO(dateTo))})}catch{return false}}
    return true
  }),[bookings,filter,dateFrom,dateTo])

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl flex flex-col max-h-screen sm:max-h-[92vh] overflow-hidden"
        style={{ background:'#050505', border:`1px solid ${c('0.35')}`, borderRadius:6, boxShadow:`0 0 0 1px rgba(255,255,255,0.03), 0 0 80px ${c('0.12')}, 0 0 160px rgba(0,0,0,0.95)` }}>

        {/* Grid BG */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:`linear-gradient(${c('0.04')} 1px,transparent 1px),linear-gradient(90deg,${c('0.04')} 1px,transparent 1px)`, backgroundSize:'40px 40px', opacity:1 }} />
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.18) 3px,rgba(0,0,0,0.18) 4px)', backgroundSize:'100% 4px' }} />
        {/* Top glow bar */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${c('0.8')},transparent)`, boxShadow:`0 0 12px 1px ${c('0.5')}` }} />
        {/* Side glow */}
        <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background:`linear-gradient(180deg,${c('0.4')},transparent 40%)` }} />
        <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background:`linear-gradient(180deg,${c('0.4')},transparent 40%)` }} />

        {/* ── HEADER ── */}
        <div className="relative flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom:`1px solid ${c('0.15')}`, background:'rgba(0,0,0,0.6)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF6A00', boxShadow:`0 0 8px 2px ${c('0.7')}` }} />
            <span className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color:c('0.9'), fontFamily:'monospace' }}>
              {authenticated ? 'R9 // PAINEL DE CONTROLE' : 'R9 // ACESSO'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {authenticated && (
              <>
                {['agenda','relatorio'].map(t=>(
                  <button key={t} onClick={()=>setTab(t)}
                    className="text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1 transition-all"
                    style={{ color: tab===t ? '#FF6A00' : 'rgba(255,255,255,0.25)', borderBottom: tab===t ? `1px solid #FF6A00` : '1px solid transparent', background:'transparent' }}>
                    {t==='agenda'?'AGENDA':'RELATÓRIO'}
                  </button>
                ))}
                <button onClick={handleRefresh} title="Atualizar"
                  className="w-7 h-7 flex items-center justify-center transition-all hover:opacity-80"
                  style={{ border:`1px solid ${c('0.2')}`, borderRadius:3, background:'rgba(255,106,0,0.05)' }}>
                  <RefreshCw size={11} color="#FF6A00" />
                </button>
              </>
            )}
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center transition-all hover:opacity-80"
              style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:3, background:'rgba(255,255,255,0.03)' }}>
              <X size={12} color="rgba(255,255,255,0.4)" />
            </button>
          </div>
        </div>

        {/* ── LOGIN ── */}
        {!authenticated ? (
          <div className="relative flex flex-col items-center justify-center flex-1 gap-10 p-10">
            <div className="absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(ellipse at 50% 40%,${c('0.06')} 0%,transparent 65%)` }} />

            <div className="flex flex-col items-center gap-4">
              <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" className="h-20 w-auto object-contain" style={{ filter:'drop-shadow(0 0 0px transparent)' }} />
              <p className="text-[11px] tracking-[0.25em] uppercase font-mono" style={{ color:c('0.5'), minHeight:16 }}>
                {bootText}<Cursor />
              </p>
            </div>

            <div className="w-full max-w-[260px] flex flex-col gap-3">
              <HudCard accent style={{ padding:'2px' }}>
                <input type="password" value={password}
                  onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handleLogin()}
                  placeholder="• • • • • • •"
                  className="w-full bg-transparent text-center outline-none px-4 py-3 text-sm font-mono tracking-[0.4em]"
                  style={{ color: pwError ? '#f87171' : '#FF6A00', caretColor:'#FF6A00', border:'none' }}
                />
              </HudCard>

              <button onClick={handleLogin}
                className="w-full py-3 text-xs font-black tracking-[0.3em] uppercase transition-all active:scale-[0.97] hover:brightness-110"
                style={{ background:`linear-gradient(135deg,#FF6A00,#FF8C00)`, color:'#000', borderRadius:4, boxShadow:`0 0 20px ${c('0.3')}`, fontFamily:'monospace' }}>
                ACESSAR SISTEMA
              </button>

              {pwError && (
                <p className="text-center text-[10px] tracking-widest uppercase font-mono" style={{ color:'#f87171' }}>
                  // ACESSO NEGADO
                </p>
              )}
            </div>
          </div>

        ) : tab === 'agenda' ? (
          /* ── AGENDA ── */
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Stats HUD */}
            <div className="grid grid-cols-4 gap-2 p-4 flex-shrink-0" style={{ borderBottom:`1px solid ${c('0.12')}` }}>
              {[
                { label:'HOJE', value: todayBookings.length, color:'#FF6A00' },
                { label:'ATIVOS', value: activeBookings.length, color:'rgba(255,255,255,0.7)' },
                { label:'LIVRES', value: availableToday.length, color:'#4ade80' },
                { label:'CANCEL.', value: cancelledCount, color:'#f87171' },
              ].map(s=>(
                <HudCard key={s.label} accent={s.label==='HOJE'} style={{ padding:'10px 8px', textAlign:'center' }}>
                  <div className="text-xl font-black font-mono" style={{ color:s.color, lineHeight:1 }}>{s.value}</div>
                  <div className="text-[9px] tracking-[0.2em] uppercase mt-1 font-mono" style={{ color:'rgba(255,255,255,0.25)' }}>{s.label}</div>
                </HudCard>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 px-4 py-2.5 flex-shrink-0 flex-wrap" style={{ borderBottom:`1px solid ${c('0.1')}` }}>
              {[['today','HOJE'],['active','ATIVOS'],['cancelled','CANCEL.'],['all','TODOS']].map(([f,l])=>(
                <button key={f} onClick={()=>setFilter(f)}
                  className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5 transition-all font-mono"
                  style={{ background: filter===f ? c('0.12') : 'transparent', border:`1px solid ${filter===f ? c('0.4') : 'rgba(255,255,255,0.08)'}`, color: filter===f ? '#FF6A00' : 'rgba(255,255,255,0.3)', borderRadius:3 }}>
                  {l}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 no-scrollbar p-4 space-y-2">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[10px] tracking-[0.3em] uppercase font-mono" style={{ color:'rgba(255,255,255,0.15)' }}>// SEM REGISTROS</p>
                </div>
              ) : (
                [...filteredBookings].sort((a,b)=>(a.dateStr||'').localeCompare(b.dateStr||'')||(a.time||'').localeCompare(b.time||'')).map(booking=>(
                  <BookingItem key={booking.id} booking={booking}
                    onConfirm={()=>handleConfirm(booking.id)}
                    onCancel={()=>handleCancel(booking.id)}
                    onReschedule={t=>handleReschedule(booking.id,t)}
                    isRescheduling={rescheduleId===booking.id}
                    onToggleReschedule={()=>setRescheduleId(rescheduleId===booking.id?null:booking.id)}
                  />
                ))
              )}
            </div>

            {/* Horários livres */}
            {filter==='today' && availableToday.length>0 && (
              <div className="p-4 flex-shrink-0" style={{ borderTop:`1px solid ${c('0.1')}` }}>
                <p className="text-[9px] tracking-[0.3em] uppercase font-mono mb-2" style={{ color:'rgba(255,255,255,0.2)' }}>// SLOTS DISPONÍVEIS HOJE</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableToday.map(t=>(
                    <span key={t} className="text-[10px] px-2.5 py-1 font-mono font-bold"
                      style={{ background:'rgba(74,222,128,0.07)', border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80', borderRadius:3 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ── RELATÓRIO ── */
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Receita */}
            <div className="grid grid-cols-2 gap-3 p-4 flex-shrink-0" style={{ borderBottom:`1px solid ${c('0.12')}` }}>
              <HudCard accent style={{ padding:'14px' }}>
                <p className="text-[9px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color:c('0.5') }}>RECEITA TOTAL</p>
                <p className="text-2xl font-black font-mono" style={{ color:'#FF6A00' }}>
                  R$ {totalRevenue.toFixed(2).replace('.',',')}
                </p>
                <p className="text-[9px] font-mono mt-1" style={{ color:'rgba(255,255,255,0.2)' }}>{activeBookings.length} agendamentos ativos</p>
              </HudCard>
              <HudCard style={{ padding:'14px' }}>
                <p className="text-[9px] tracking-[0.25em] uppercase font-mono mb-2" style={{ color:'rgba(255,255,255,0.25)' }}>RECEITA HOJE</p>
                <p className="text-2xl font-black font-mono text-white">
                  R$ {todayRevenue.toFixed(2).replace('.',',')}
                </p>
                <p className="text-[9px] font-mono mt-1" style={{ color:'rgba(255,255,255,0.2)' }}>{todayBookings.filter(b=>b.status!=='cancelled').length} hoje</p>
              </HudCard>
            </div>

            {/* Breakdown serviços */}
            <div className="p-4 flex-shrink-0" style={{ borderBottom:`1px solid ${c('0.1')}` }}>
              <p className="text-[9px] tracking-[0.3em] uppercase font-mono mb-3" style={{ color:'rgba(255,255,255,0.2)' }}>// SERVIÇOS MAIS AGENDADOS</p>
              <div className="space-y-2.5">
                {Object.entries(serviceBreakdown).sort((a,b)=>b[1]-a[1]).map(([name,count])=>{
                  const pct = activeBookings.length>0 ? Math.round((count/activeBookings.length)*100) : 0
                  return (
                    <div key={name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[11px] font-mono text-white tracking-wide">{name}</span>
                        <span className="text-[11px] font-mono font-black" style={{ color:'#FF6A00' }}>{count}x &nbsp;{pct}%</span>
                      </div>
                      <div className="h-1 rounded-none" style={{ background:'rgba(255,255,255,0.05)' }}>
                        <div className="h-1" style={{ width:`${pct}%`, background:`linear-gradient(90deg,#FF6A00,#FF8C00)`, boxShadow:`0 0 6px ${c('0.5')}`, transition:'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
                {Object.keys(serviceBreakdown).length===0 && (
                  <p className="text-[10px] font-mono" style={{ color:'rgba(255,255,255,0.15)' }}>// SEM DADOS</p>
                )}
              </div>
            </div>

            {/* Export */}
            <div className="p-4 flex-shrink-0" style={{ borderBottom:`1px solid ${c('0.1')}` }}>
              <p className="text-[9px] tracking-[0.3em] uppercase font-mono mb-3" style={{ color:'rgba(255,255,255,0.2)' }}>// EXPORTAR RELATÓRIO CSV</p>
              <div className="flex gap-2 items-end flex-wrap mb-3">
                <div className="flex-1 min-w-[110px]">
                  <p className="text-[9px] font-mono mb-1 tracking-widest uppercase" style={{ color:'rgba(255,255,255,0.25)' }}>DE</p>
                  <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                    style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${c('0.2')}`, color:'#FF6A00', borderRadius:3, padding:'7px 10px', outline:'none', fontSize:11, width:'100%', fontFamily:'monospace' }} />
                </div>
                <div className="flex-1 min-w-[110px]">
                  <p className="text-[9px] font-mono mb-1 tracking-widest uppercase" style={{ color:'rgba(255,255,255,0.25)' }}>ATÉ</p>
                  <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                    style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${c('0.2')}`, color:'#FF6A00', borderRadius:3, padding:'7px 10px', outline:'none', fontSize:11, width:'100%', fontFamily:'monospace' }} />
                </div>
                <button onClick={()=>{
                  let data=bookings
                  if(dateFrom&&dateTo) data=bookings.filter(b=>{try{const d=parseISO(b.dateStr);return isWithinInterval(d,{start:startOfDay(parseISO(dateFrom)),end:endOfDay(parseISO(dateTo))})}catch{return false}})
                  exportCSV(data,dateFrom&&dateTo?`${dateFrom}_${dateTo}`:'todos')
                }}
                  className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black tracking-[0.2em] uppercase font-mono transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{ background:`linear-gradient(135deg,#FF6A00,#FF8C00)`, color:'#000', borderRadius:3, flexShrink:0, boxShadow:`0 0 15px ${c('0.25')}` }}>
                  <Download size={12} />BAIXAR
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[['Hoje',()=>exportCSV(todayBookings,format(new Date(),'dd-MM-yyyy'))],
                  ['Ativos',()=>exportCSV(activeBookings,'ativos')],
                  ['Completo',()=>exportCSV(bookings,'completo')]].map(([l,fn])=>(
                  <button key={l} onClick={fn}
                    className="text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-1.5 transition-all hover:border-orange-500/50"
                    style={{ background:'transparent', border:`1px solid rgba(255,255,255,0.08)`, color:'rgba(255,255,255,0.35)', borderRadius:3 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista por período */}
            {dateFrom&&dateTo && (
              <div className="overflow-y-auto flex-1 no-scrollbar p-4 space-y-2">
                <p className="text-[9px] tracking-[0.3em] uppercase font-mono mb-2" style={{ color:'rgba(255,255,255,0.2)' }}>
                  // {filteredBookings.length} REGISTROS NO PERÍODO
                </p>
                {filteredBookings.length===0
                  ? <p className="text-[10px] font-mono text-center py-8" style={{ color:'rgba(255,255,255,0.15)' }}>// SEM DADOS</p>
                  : [...filteredBookings].sort((a,b)=>(a.dateStr||'').localeCompare(b.dateStr||'')).map(booking=>(
                    <BookingItem key={booking.id} booking={booking} readOnly
                      onConfirm={()=>handleConfirm(booking.id)} onCancel={()=>handleCancel(booking.id)}
                      onReschedule={t=>handleReschedule(booking.id,t)}
                      isRescheduling={rescheduleId===booking.id}
                      onToggleReschedule={()=>setRescheduleId(rescheduleId===booking.id?null:booking.id)}
                    />
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* Bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${c('0.4')},transparent)` }} />
      </div>
    </div>
  )
}

function BookingItem({ booking, onConfirm, onCancel, onReschedule, isRescheduling, onToggleReschedule, readOnly }) {
  const isCancelled = booking.status==='cancelled'
  let dateLabel=''
  try { const d=parseISO(booking.dateStr); dateLabel=isToday(d)?'HOJE':format(d,"dd/MM",{locale:ptBR}) } catch {}

  return (
    <HudCard accent={!isCancelled} style={{ padding:'12px', opacity: isCancelled ? 0.4 : 1 }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background:'rgba(255,106,0,0.08)', border:`1px solid ${c('0.2')}` }}>
            <User size={12} color="#FF6A00" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate text-white font-mono tracking-wide">{booking.clientName}</p>
            <p className="text-[10px] font-mono" style={{ color:'rgba(255,255,255,0.3)' }}>{booking.clientPhone}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 font-black text-sm font-mono" style={{ color:'#FF6A00' }}>
            <Clock size={11}/>{booking.time}
          </div>
          <div className="text-[10px] font-mono" style={{ color:'rgba(255,255,255,0.25)' }}>{dateLabel}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 mb-2" style={{ borderTop:`1px solid rgba(255,255,255,0.05)` }}>
        <Scissors size={10} color="#FF6A00" style={{ flexShrink:0 }} />
        <span className="text-[11px] font-mono text-white tracking-wide">{booking.service?.name}</span>
        <span className="text-[11px] font-mono font-black ml-auto" style={{ color:'#FF6A00' }}>{booking.service?.priceDisplay}</span>
      </div>

      {!isCancelled&&!readOnly&&(
        <div className="flex gap-1.5">
          {[
            { label:'OK', fn:onConfirm, color:'#4ade80', bg:'rgba(74,222,128,0.07)', border:'rgba(74,222,128,0.2)', Icon:Check },
            { label:'REAGENDAR', fn:onToggleReschedule, color:'#FF6A00', bg:c('0.07'), border:c('0.2'), Icon:RefreshCw },
            { label:'CANCELAR', fn:onCancel, color:'#f87171', bg:'rgba(239,68,68,0.07)', border:'rgba(239,68,68,0.2)', Icon:XCircle },
          ].map(({label,fn,color,bg,border,Icon})=>(
            <button key={label} onClick={fn}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-black tracking-[0.15em] uppercase font-mono transition-all hover:brightness-125"
              style={{ background:bg, border:`1px solid ${border}`, color, borderRadius:3 }}>
              <Icon size={10}/>{label}
            </button>
          ))}
        </div>
      )}

      {isRescheduling&&!readOnly&&(
        <div className="grid grid-cols-5 gap-1 pt-2" style={{ borderTop:`1px solid rgba(255,255,255,0.05)` }}>
          {TIME_SLOTS.map(t=>(
            <button key={t} onClick={()=>onReschedule(t)}
              className="py-1.5 text-[10px] font-mono font-bold transition-all"
              style={t===booking.time
                ? { background:c('0.18'), border:`1px solid ${c('0.5')}`, color:'#FF6A00', borderRadius:3 }
                : { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.35)', borderRadius:3 }}>
              {t}
            </button>
          ))}
        </div>
      )}
    </HudCard>
  )
}
