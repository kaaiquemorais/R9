import { useState, useEffect } from 'react'
import { X, Check, XCircle, RefreshCw, Calendar, User, Clock, Scissors, Download } from 'lucide-react'
import { format, isToday, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getBookedSlots, cancelBooking, updateBookingStatus } from '../utils/calendar'
import { TIME_SLOTS } from '../data/services'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'vet997'

function exportCSV(bookings, label) {
  const rows = [['Nome', 'Telefone', 'Serviço', 'Preço', 'Data', 'Hora', 'Status']]
  bookings.forEach(b => rows.push([
    b.clientName || '', b.clientPhone || '', b.service?.name || '',
    b.service?.priceDisplay || '', b.dateStr || '', b.time || '', b.status || 'confirmado'
  ]))
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `r9-${label}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success('Relatório exportado!')
}

function Corner({ pos }) {
  const transforms = {
    tl: 'none', tr: 'scaleX(-1)', bl: 'scaleY(-1)', br: 'scale(-1,-1)'
  }
  const positions = {
    tl: { top: 0, left: 0 }, tr: { top: 0, right: 0 },
    bl: { bottom: 0, left: 0 }, br: { bottom: 0, right: 0 }
  }
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
      style={{ position: 'absolute', transform: transforms[pos], ...positions[pos] }}>
      <path d="M1 11 L1 1 L11 1" stroke="rgba(255,106,0,0.6)" strokeWidth="1.5"/>
    </svg>
  )
}

function HCard({ children, style, glow }) {
  return (
    <div style={{
      position: 'relative',
      background: glow ? 'rgba(255,106,0,0.05)' : 'rgba(255,255,255,0.02)',
      border: glow ? '1px solid rgba(255,106,0,0.3)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 4,
      ...style
    }}>
      <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
      {children}
    </div>
  )
}

function Blink() {
  const [on, setOn] = useState(true)
  useEffect(() => { const t = setInterval(() => setOn(v => !v), 500); return () => clearInterval(t) }, [])
  return <span style={{ display: 'inline-block', width: 2, height: '0.85em', background: on ? '#FF6A00' : 'transparent', marginLeft: 2, verticalAlign: 'middle', borderRadius: 1 }} />
}

export default function AdminDashboard({ isOpen, onClose }) {
  const [auth, setAuth] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('agenda')
  const [filter, setFilter] = useState('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reId, setReId] = useState(null)
  const [bootText, setBootText] = useState('')

  useEffect(() => {
    if (!isOpen) return
    if (auth) return
    const msg = 'SISTEMA R9 // ACESSO RESTRITO'
    let i = 0; setBootText('')
    const t = setInterval(() => { i++; setBootText(msg.slice(0, i)); if (i >= msg.length) clearInterval(t) }, 50)
    return () => clearInterval(t)
  }, [isOpen, auth])

  if (!isOpen) return null

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuth(true); setBookings(getBookedSlots()) }
    else { setErr(true); setPw(''); setTimeout(() => setErr(false), 1500) }
  }

  const refresh = () => { setBookings(getBookedSlots()); toast.success('Sincronizado') }

  const getFiltered = () => {
    return bookings.filter(b => {
      try {
        if (filter === 'today') return isToday(parseISO(b.dateStr))
        if (filter === 'active') return b.status !== 'cancelled'
        if (filter === 'cancelled') return b.status === 'cancelled'
        if (filter === 'range' && dateFrom && dateTo) {
          const d = parseISO(b.dateStr)
          return isWithinInterval(d, { start: startOfDay(parseISO(dateFrom)), end: endOfDay(parseISO(dateTo)) })
        }
        return true
      } catch { return false }
    })
  }

  const filtered = getFiltered()
  const todayList = bookings.filter(b => { try { return isToday(parseISO(b.dateStr)) } catch { return false } })
  const activeList = bookings.filter(b => b.status !== 'cancelled')
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length
  const totalRevenue = activeList.reduce((a, b) => a + (b.service?.price || 0), 0)
  const todayRevenue = todayList.filter(b => b.status !== 'cancelled').reduce((a, b) => a + (b.service?.price || 0), 0)
  const freeTodaySlots = TIME_SLOTS.filter(t => !todayList.map(b => b.time).includes(t))

  const serviceBreakdown = activeList.reduce((acc, b) => {
    const n = b.service?.name || 'Outro'; acc[n] = (acc[n] || 0) + 1; return acc
  }, {})

  const sorted = [...filtered].sort((a, b) =>
    (a.dateStr || '').localeCompare(b.dateStr || '') || (a.time || '').localeCompare(b.time || ''))

  const rangeFiltered = bookings.filter(b => {
    if (!dateFrom || !dateTo) return false
    try {
      return isWithinInterval(parseISO(b.dateStr), { start: startOfDay(parseISO(dateFrom)), end: endOfDay(parseISO(dateTo)) })
    } catch { return false }
  })

  // shared styles
  const oBorder = '1px solid rgba(255,106,0,0.2)'
  const dimBorder = '1px solid rgba(255,255,255,0.07)'
  const monoSm = { fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }
  const tabBtn = (active) => ({
    fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 900,
    background: 'transparent', border: 'none', padding: '4px 10px', cursor: 'pointer',
    color: active ? '#FF6A00' : 'rgba(255,255,255,0.25)',
    borderBottom: active ? '1px solid #FF6A00' : '1px solid transparent',
  })
  const filterBtn = (active) => ({
    fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 900,
    padding: '5px 10px', borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s',
    background: active ? 'rgba(255,106,0,0.1)' : 'transparent',
    border: active ? '1px solid rgba(255,106,0,0.4)' : dimBorder,
    color: active ? '#FF6A00' : 'rgba(255,255,255,0.3)',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(8px)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 680,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        background: '#060606',
        border: '1px solid rgba(255,106,0,0.3)',
        borderRadius: 6,
        boxShadow: '0 0 80px rgba(255,106,0,0.1), 0 0 200px rgba(0,0,0,1)',
        overflow: 'hidden',
      }}>
        {/* Grid BG */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(255,106,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,106,0,0.03) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }} />
        {/* Scanlines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)',
        }} />
        {/* Top glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,106,0,0.9),transparent)', zIndex: 1 }} />

        {/* HEADER */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,106,0,0.12)', background: 'rgba(0,0,0,0.5)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6A00', boxShadow: '0 0 8px 3px rgba(255,106,0,0.6)' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.25em', color: 'rgba(255,106,0,0.85)', fontWeight: 900 }}>
              {auth ? 'R9 // PAINEL' : 'R9 // ACESSO'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {auth && (
              <>
                <button style={tabBtn(tab === 'agenda')} onClick={() => setTab('agenda')}>AGENDA</button>
                <button style={tabBtn(tab === 'relatorio')} onClick={() => setTab('relatorio')}>RELATÓRIO</button>
                <button onClick={refresh} style={{ background: 'rgba(255,106,0,0.06)', border: oBorder, borderRadius: 3, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <RefreshCw size={11} color="#FF6A00" />
                </button>
              </>
            )}
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.03)', border: dimBorder, borderRadius: 3, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={12} color="rgba(255,255,255,0.4)" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* ── LOGIN ── */}
          {!auth && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 32, padding: 40 }}>
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,106,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 76, width: 'auto', objectFit: 'contain' }} />
                <p style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,106,0,0.5)', minHeight: 14 }}>
                  {bootText}<Blink />
                </p>
              </div>
              <div style={{ width: '100%', maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <HCard glow style={{ padding: 2 }}>
                  <input
                    type="password" value={pw}
                    onChange={e => setPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && login()}
                    placeholder="· · · · · · ·"
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      textAlign: 'center', fontFamily: 'monospace', fontSize: 14, letterSpacing: '0.4em',
                      color: err ? '#f87171' : '#FF6A00', caretColor: '#FF6A00',
                      padding: '12px 16px', boxSizing: 'border-box',
                    }}
                  />
                </HCard>
                <button onClick={login} style={{
                  width: '100%', padding: '12px 0', fontFamily: 'monospace', fontSize: 11,
                  letterSpacing: '0.3em', fontWeight: 900, textTransform: 'uppercase',
                  background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: '#000',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(255,106,0,0.35)',
                }}>
                  ACESSAR SISTEMA
                </button>
                {err && <p style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: '#f87171', textAlign: 'center' }}>// ACESSO NEGADO</p>}
              </div>
            </div>
          )}

          {/* ── AGENDA ── */}
          {auth && tab === 'agenda' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,106,0,0.1)', flexShrink: 0 }}>
                {[
                  { label: 'HOJE', value: todayList.length, color: '#FF6A00', glow: true },
                  { label: 'ATIVOS', value: activeList.length, color: 'rgba(255,255,255,0.8)' },
                  { label: 'LIVRES', value: freeTodaySlots.length, color: '#4ade80' },
                  { label: 'CANCEL.', value: cancelledCount, color: '#f87171' },
                ].map(s => (
                  <HCard key={s.label} glow={s.glow} style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ ...monoSm, marginTop: 4 }}>{s.label}</div>
                  </HCard>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid rgba(255,106,0,0.1)', flexShrink: 0, flexWrap: 'wrap' }}>
                {[['today', 'HOJE'], ['active', 'ATIVOS'], ['cancelled', 'CANCEL.'], ['all', 'TODOS']].map(([f, l]) => (
                  <button key={f} onClick={() => setFilter(f)} style={filterBtn(filter === f)}>{l}</button>
                ))}
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ ...monoSm, fontSize: 10 }}>// SEM REGISTROS</p>
                  </div>
                ) : sorted.map(b => (
                  <BItem key={b.id} b={b}
                    onConfirm={() => { updateBookingStatus(b.id, 'confirmed'); setBookings(getBookedSlots()); toast.success('Confirmado') }}
                    onCancel={() => { cancelBooking(b.id); setBookings(getBookedSlots()); toast.success('Cancelado') }}
                    onReschedule={t => { const u = bookings.map(x => x.id === b.id ? { ...x, time: t } : x); localStorage.setItem('r9_bookings', JSON.stringify(u)); setBookings(u); setReId(null); toast.success('Reagendado') }}
                    reMode={reId === b.id}
                    onToggleRe={() => setReId(reId === b.id ? null : b.id)}
                  />
                ))}
              </div>

              {/* Free slots */}
              {filter === 'today' && freeTodaySlots.length > 0 && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,106,0,0.1)', flexShrink: 0 }}>
                  <p style={{ ...monoSm, marginBottom: 8 }}>// SLOTS LIVRES HOJE</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {freeTodaySlots.map(t => (
                      <span key={t} style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '4px 10px', background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: 3 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── RELATÓRIO ── */}
          {auth && tab === 'relatorio' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              {/* Revenue */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 16, borderBottom: '1px solid rgba(255,106,0,0.1)' }}>
                <HCard glow style={{ padding: 16 }}>
                  <p style={{ ...monoSm, color: 'rgba(255,106,0,0.5)', marginBottom: 8 }}>RECEITA TOTAL</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: '#FF6A00' }}>R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                  <p style={{ ...monoSm, marginTop: 6 }}>{activeList.length} agendamentos ativos</p>
                </HCard>
                <HCard style={{ padding: 16 }}>
                  <p style={{ ...monoSm, marginBottom: 8 }}>RECEITA HOJE</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: 'white' }}>R$ {todayRevenue.toFixed(2).replace('.', ',')}</p>
                  <p style={{ ...monoSm, marginTop: 6 }}>{todayList.filter(b => b.status !== 'cancelled').length} hoje</p>
                </HCard>
              </div>

              {/* Service breakdown */}
              <div style={{ padding: 16, borderBottom: '1px solid rgba(255,106,0,0.1)' }}>
                <p style={{ ...monoSm, marginBottom: 12 }}>// SERVIÇOS MAIS AGENDADOS</p>
                {Object.keys(serviceBreakdown).length === 0
                  ? <p style={{ ...monoSm }}>// SEM DADOS</p>
                  : Object.entries(serviceBreakdown).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                    const pct = activeList.length > 0 ? Math.round((count / activeList.length) * 100) : 0
                    return (
                      <div key={name} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'white' }}>{name}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 900, color: '#FF6A00' }}>{count}x · {pct}%</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                          <div style={{ height: 3, width: `${pct}%`, background: 'linear-gradient(90deg,#FF6A00,#FF8C00)', boxShadow: '0 0 6px rgba(255,106,0,0.5)', borderRadius: 2, transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Export */}
              <div style={{ padding: 16, borderBottom: '1px solid rgba(255,106,0,0.1)' }}>
                <p style={{ ...monoSm, marginBottom: 12 }}>// EXPORTAR RELATÓRIO CSV</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
                  {[['DE', dateFrom, setDateFrom], ['ATÉ', dateTo, setDateTo]].map(([lbl, val, setter]) => (
                    <div key={lbl} style={{ flex: 1, minWidth: 120 }}>
                      <p style={{ ...monoSm, marginBottom: 4 }}>{lbl}</p>
                      <input type="date" value={val} onChange={e => setter(e.target.value)} style={{
                        width: '100%', background: 'rgba(255,255,255,0.03)', border: oBorder,
                        borderRadius: 3, padding: '7px 10px', outline: 'none',
                        fontFamily: 'monospace', fontSize: 11, color: '#FF6A00',
                        boxSizing: 'border-box',
                      }} />
                    </div>
                  ))}
                  <button onClick={() => exportCSV(rangeFiltered.length > 0 ? rangeFiltered : bookings, dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'todos')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: '#000', border: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', flexShrink: 0 }}>
                    <Download size={12} />BAIXAR
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['Hoje', () => exportCSV(todayList, format(new Date(), 'dd-MM-yyyy'))],
                    ['Ativos', () => exportCSV(activeList, 'ativos')],
                    ['Completo', () => exportCSV(bookings, 'completo')]].map(([l, fn]) => (
                    <button key={l} onClick={fn} style={{ ...filterBtn(false), padding: '5px 12px' }}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Range list */}
              {dateFrom && dateTo && (
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ ...monoSm, padding: '0 4px' }}>// {rangeFiltered.length} REGISTROS NO PERÍODO</p>
                  {rangeFiltered.length === 0
                    ? <p style={{ ...monoSm, textAlign: 'center', padding: '20px 0' }}>// SEM DADOS</p>
                    : [...rangeFiltered].sort((a, b) => (a.dateStr || '').localeCompare(b.dateStr || '')).map(b => (
                      <BItem key={b.id} b={b} readOnly
                        onConfirm={() => { updateBookingStatus(b.id, 'confirmed'); setBookings(getBookedSlots()) }}
                        onCancel={() => { cancelBooking(b.id); setBookings(getBookedSlots()) }}
                        onReschedule={() => {}}
                        reMode={false} onToggleRe={() => {}}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,106,0,0.5),transparent)', zIndex: 3 }} />
      </div>
    </div>
  )
}

function BItem({ b, onConfirm, onCancel, onReschedule, reMode, onToggleRe, readOnly }) {
  const cancelled = b.status === 'cancelled'
  let dateLabel = ''
  try { const d = parseISO(b.dateStr); dateLabel = isToday(d) ? 'HOJE' : format(d, 'dd/MM', { locale: ptBR }) } catch {}

  return (
    <HCard glow={!cancelled} style={{ padding: 12, opacity: cancelled ? 0.4 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,106,0,0.08)', border: '1px solid rgba(255,106,0,0.2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={13} color="#FF6A00" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.clientName}</p>
            <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{b.clientPhone}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 900, color: '#FF6A00', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />{b.time}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{dateLabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: !cancelled && !readOnly ? 8 : 0 }}>
        <Scissors size={10} color="#FF6A00" />
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'white' }}>{b.service?.name}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 900, color: '#FF6A00', marginLeft: 'auto' }}>{b.service?.priceDisplay}</span>
      </div>

      {!cancelled && !readOnly && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { l: 'OK', fn: onConfirm, color: '#4ade80', bg: 'rgba(74,222,128,0.07)', bdr: 'rgba(74,222,128,0.2)', Icon: Check },
            { l: 'REAGENDAR', fn: onToggleRe, color: '#FF6A00', bg: 'rgba(255,106,0,0.07)', bdr: 'rgba(255,106,0,0.2)', Icon: RefreshCw },
            { l: 'CANCELAR', fn: onCancel, color: '#f87171', bg: 'rgba(239,68,68,0.07)', bdr: 'rgba(239,68,68,0.2)', Icon: XCircle },
          ].map(({ l, fn, color, bg, bdr, Icon }) => (
            <button key={l} onClick={fn} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 0', background: bg, border: `1px solid ${bdr}`, color, borderRadius: 3, fontFamily: 'monospace', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              <Icon size={10} />{l}
            </button>
          ))}
        </div>
      )}

      {reMode && !readOnly && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 8 }}>
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => onReschedule(t)} style={{
              padding: '5px 0', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, cursor: 'pointer', borderRadius: 3,
              background: t === b.time ? 'rgba(255,106,0,0.18)' : 'rgba(255,255,255,0.03)',
              border: t === b.time ? '1px solid rgba(255,106,0,0.5)' : '1px solid rgba(255,255,255,0.07)',
              color: t === b.time ? '#FF6A00' : 'rgba(255,255,255,0.35)',
            }}>{t}</button>
          ))}
        </div>
      )}
    </HCard>
  )
}
