import { useState, useEffect } from 'react'
import { X, Check, XCircle, RefreshCw, Calendar, User, Clock, Scissors, Download, Sun, Moon } from 'lucide-react'
import { format, isToday, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getBookedSlots, cancelBooking, updateBookingStatus, rescheduleBooking } from '../utils/calendar'
import { TIME_SLOTS } from '../data/services'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'vet997'

/* ── Theme tokens ── */
const DARK = {
  panel:        '#060606',
  panelBorder:  '1px solid rgba(255,106,0,0.3)',
  panelShadow:  '0 0 80px rgba(255,106,0,0.1), 0 0 200px rgba(0,0,0,1)',
  headerBg:     'rgba(0,0,0,0.5)',
  headerBorder: '1px solid rgba(255,106,0,0.12)',
  sectionBorder:'1px solid rgba(255,106,0,0.1)',
  cardBg:       'rgba(255,255,255,0.02)',
  cardBorder:   '1px solid rgba(255,255,255,0.07)',
  cardGlowBg:   'rgba(255,106,0,0.05)',
  cardGlowBrd:  '1px solid rgba(255,106,0,0.3)',
  inputBg:      'rgba(255,255,255,0.03)',
  inputBorder:  '1px solid rgba(255,106,0,0.2)',
  text:         'white',
  textMuted:    'rgba(255,255,255,0.25)',
  textSub:      'rgba(255,255,255,0.5)',
  accent:       '#FF6A00',
  green:        '#4ade80',
  red:          '#f87171',
  mono:         true,
  cornerColor:  'rgba(255,106,0,0.6)',
  scanlines:    true,
  grid:         true,
  topGlow:      true,
  bottomGlow:   true,
  pill:         (a) => ({
    fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 900,
    padding: '5px 10px', borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
    background: a ? 'rgba(255,106,0,0.1)' : 'transparent',
    outline: a ? '1px solid rgba(255,106,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
    color: a ? '#FF6A00' : 'rgba(255,255,255,0.3)',
  }),
  tab:          (a) => ({
    fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 900,
    background: 'transparent', border: 'none', padding: '4px 10px', cursor: 'pointer',
    color: a ? '#FF6A00' : 'rgba(255,255,255,0.25)',
    borderBottom: a ? '1px solid #FF6A00' : '1px solid transparent',
  }),
  monoSm: { fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' },
  headerLabel: { fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.25em', color: 'rgba(255,106,0,0.85)', fontWeight: 900 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#FF6A00', boxShadow: '0 0 8px 3px rgba(255,106,0,0.6)', marginRight: 6 },
}

const LIGHT = {
  panel:        '#f8f9fa',
  panelBorder:  '1px solid rgba(0,0,0,0.08)',
  panelShadow:  '0 24px 80px rgba(0,0,0,0.2)',
  headerBg:     'white',
  headerBorder: '1px solid #f0f0f0',
  sectionBorder:'1px solid #f0f0f0',
  cardBg:       'white',
  cardBorder:   '1px solid #ececec',
  cardGlowBg:   '#fff7f0',
  cardGlowBrd:  '1px solid #ffd4b0',
  inputBg:      '#f9fafb',
  inputBorder:  '1px solid #e5e7eb',
  text:         '#111',
  textMuted:    '#9ca3af',
  textSub:      '#6b7280',
  accent:       '#FF6A00',
  green:        '#16a34a',
  red:          '#dc2626',
  mono:         false,
  cornerColor:  'rgba(255,106,0,0.4)',
  scanlines:    false,
  grid:         false,
  topGlow:      false,
  bottomGlow:   false,
  pill:         (a) => ({
    fontSize: 12, fontWeight: 600,
    padding: '6px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', border: 'none',
    background: a ? '#FF6A00' : '#f3f4f6',
    color: a ? 'white' : '#6b7280',
  }),
  tab:          (a) => ({
    fontSize: 13, fontWeight: 600, background: 'transparent', border: 'none', padding: '10px 20px', cursor: 'pointer',
    color: a ? '#FF6A00' : '#9ca3af',
    borderBottom: a ? '2px solid #FF6A00' : '2px solid transparent',
    transition: 'all 0.15s',
  }),
  monoSm: { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' },
  headerLabel: { fontSize: 15, fontWeight: 700, color: '#111' },
  dot: { display: 'none' },
}

function Corner({ pos, color }) {
  const transforms = { tl: 'none', tr: 'scaleX(-1)', bl: 'scaleY(-1)', br: 'scale(-1,-1)' }
  const positions  = { tl: { top: 0, left: 0 }, tr: { top: 0, right: 0 }, bl: { bottom: 0, left: 0 }, br: { bottom: 0, right: 0 } }
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
      style={{ position: 'absolute', transform: transforms[pos], ...positions[pos] }}>
      <path d="M1 11 L1 1 L11 1" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

function HCard({ children, style, glow, th }) {
  return (
    <div style={{
      position: 'relative',
      background: glow ? th.cardGlowBg : th.cardBg,
      border: glow ? th.cardGlowBrd : th.cardBorder,
      borderRadius: th.mono ? 4 : 12,
      boxShadow: th.mono ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
      ...style,
    }}>
      {th.mono && <><Corner pos="tl" color={th.cornerColor}/><Corner pos="tr" color={th.cornerColor}/><Corner pos="bl" color={th.cornerColor}/><Corner pos="br" color={th.cornerColor}/></>}
      {children}
    </div>
  )
}

function Blink() {
  const [on, setOn] = useState(true)
  useEffect(() => { const t = setInterval(() => setOn(v => !v), 500); return () => clearInterval(t) }, [])
  return <span style={{ display: 'inline-block', width: 2, height: '0.85em', background: on ? '#FF6A00' : 'transparent', marginLeft: 2, verticalAlign: 'middle', borderRadius: 1 }} />
}

function exportCSV(bookings, label) {
  const rows = [['Nome', 'Telefone', 'Serviço', 'Preço', 'Data', 'Hora', 'Status']]
  bookings.forEach(b => rows.push([b.clientName||'', b.clientPhone||'', b.service?.name||'', b.service?.priceDisplay||'', b.dateStr||'', b.time||'', b.status||'confirmado']))
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `r9-${label}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success('Relatório exportado!')
}

export default function AdminDashboard({ isOpen, onClose }) {
  const [auth, setAuth]       = useState(false)
  const [pw, setPw]           = useState('')
  const [err, setErr]         = useState(false)
  const [bookings, setBookings] = useState([])
  const [tab, setTab]         = useState('agenda')
  const [filter, setFilter]   = useState('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]   = useState('')
  const [reId, setReId]       = useState(null)
  const [bootText, setBootText] = useState('')
  const [theme, setTheme]     = useState('dark')

  const th = theme === 'dark' ? DARK : LIGHT

  useEffect(() => {
    if (!isOpen || auth) return
    const msg = 'SISTEMA R9 // ACESSO RESTRITO'
    let i = 0; setBootText('')
    const t = setInterval(() => { i++; setBootText(msg.slice(0, i)); if (i >= msg.length) clearInterval(t) }, 50)
    return () => clearInterval(t)
  }, [isOpen, auth])

  if (!isOpen) return null

  const login = async () => {
    if (pw === ADMIN_PASSWORD) { setAuth(true); setBookings(await getBookedSlots()) }
    else { setErr(true); setPw(''); setTimeout(() => setErr(false), 1500) }
  }

  const refresh = async () => { setBookings(await getBookedSlots()); toast.success('Sincronizado') }

  const todayList    = bookings.filter(b => { try { return isToday(parseISO(b.dateStr)) } catch { return false } })
  const activeList   = bookings.filter(b => b.status !== 'cancelled')
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length
  const totalRevenue = activeList.reduce((a, b) => a + (b.service?.price || 0), 0)
  const todayRevenue = todayList.filter(b => b.status !== 'cancelled').reduce((a, b) => a + (b.service?.price || 0), 0)
  const freeTodaySlots = TIME_SLOTS.filter(t => !todayList.map(b => b.time).includes(t))
  const serviceBreakdown = activeList.reduce((acc, b) => { const n = b.service?.name||'Outro'; acc[n]=(acc[n]||0)+1; return acc }, {})

  const getFiltered = () => bookings.filter(b => {
    try {
      if (filter === 'today')     return isToday(parseISO(b.dateStr))
      if (filter === 'active')    return b.status !== 'cancelled'
      if (filter === 'cancelled') return b.status === 'cancelled'
      if (filter === 'range' && dateFrom && dateTo)
        return isWithinInterval(parseISO(b.dateStr), { start: startOfDay(parseISO(dateFrom)), end: endOfDay(parseISO(dateTo)) })
      return true
    } catch { return false }
  })

  const sorted = [...getFiltered()].sort((a, b) =>
    (a.dateStr||'').localeCompare(b.dateStr||'') || (a.time||'').localeCompare(b.time||''))

  const rangeFiltered = bookings.filter(b => {
    if (!dateFrom || !dateTo) return false
    try { return isWithinInterval(parseISO(b.dateStr), { start: startOfDay(parseISO(dateFrom)), end: endOfDay(parseISO(dateTo)) }) }
    catch { return false }
  })

  const iconBtn = (onClick, children, title) => ({
    onClick, title,
    style: {
      background: th.mono ? 'rgba(255,106,0,0.06)' : '#f3f4f6',
      border: th.mono ? '1px solid rgba(255,106,0,0.2)' : '1px solid #e5e7eb',
      borderRadius: th.mono ? 3 : 8,
      width: 28, height: 28,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    },
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: th.mono ? 'rgba(0,0,0,0.93)' : 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: 680, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        background: th.panel, border: th.panelBorder, borderRadius: th.mono ? 6 : 16,
        boxShadow: th.panelShadow, overflow: 'hidden',
      }}>

        {/* Dark mode decorations */}
        {th.grid && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(rgba(255,106,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,106,0,0.03) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />}
        {th.scanlines && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)' }} />}
        {th.topGlow    && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,106,0,0.9),transparent)', zIndex: 1 }} />}
        {th.bottomGlow && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,106,0,0.5),transparent)', zIndex: 3 }} />}

        {/* ── HEADER ── */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: th.mono ? '10px 16px' : '14px 20px', borderBottom: th.headerBorder, background: th.headerBg, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {th.mono && <div style={th.dot} />}
            {!th.mono && <div style={{ width: 32, height: 32, borderRadius: 8, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 22, objectFit: 'contain' }} /></div>}
            <span style={th.headerLabel}>{auth ? (th.mono ? 'R9 // PAINEL' : 'Painel Admin') : (th.mono ? 'R9 // ACESSO' : 'Acesso Restrito')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {auth && (
              <>
                <button style={th.tab(tab === 'agenda')}    onClick={() => setTab('agenda')}>   {th.mono ? 'AGENDA'    : 'Agenda'}   </button>
                <button style={th.tab(tab === 'relatorio')} onClick={() => setTab('relatorio')}>{th.mono ? 'RELATÓRIO' : 'Relatório'}</button>
                <button {...iconBtn(refresh, null, 'Sincronizar')}>
                  <RefreshCw size={11} color={th.mono ? '#FF6A00' : '#6b7280'} />
                </button>
              </>
            )}
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              style={{
                background: th.mono ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
                border: th.mono ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                borderRadius: th.mono ? 3 : 8,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
              {theme === 'dark'
                ? <Sun  size={12} color={th.mono ? 'rgba(255,255,255,0.5)' : '#6b7280'} />
                : <Moon size={12} color="#6b7280" />}
            </button>
            <button
              onClick={onClose}
              style={{
                background: th.mono ? 'rgba(255,255,255,0.03)' : '#f3f4f6',
                border: th.mono ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e5e7eb',
                borderRadius: th.mono ? 3 : 8,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
              <X size={12} color={th.mono ? 'rgba(255,255,255,0.4)' : '#6b7280'} />
            </button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* ── LOGIN ── */}
          {!auth && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 28, padding: 40 }}>
              {th.mono && <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,106,0,0.06) 0%,transparent 70%)', pointerEvents: 'none' }} />}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {th.mono
                  ? <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 72, objectFit: 'contain' }} />
                  : <div style={{ width: 64, height: 64, borderRadius: 16, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}><img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 44, objectFit: 'contain' }} /></div>
                }
                {th.mono && <p style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,106,0,0.5)', minHeight: 14 }}>{bootText}<Blink /></p>}
                {!th.mono && <div style={{ textAlign: 'center' }}><p style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>Bem-vindo</p><p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Digite sua senha para continuar</p></div>}
              </div>

              <div style={{ width: '100%', maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <HCard th={th} glow style={{ padding: th.mono ? 2 : 0, borderRadius: th.mono ? 4 : 12 }}>
                  <input
                    type="password" value={pw}
                    onChange={e => { setPw(e.target.value); setErr(false) }}
                    onKeyDown={e => e.key === 'Enter' && login()}
                    placeholder={th.mono ? '· · · · · · ·' : 'Senha'}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      textAlign: 'center', padding: '12px 16px', boxSizing: 'border-box',
                      fontFamily: th.mono ? 'monospace' : 'inherit',
                      fontSize: th.mono ? 14 : 15,
                      letterSpacing: th.mono ? '0.4em' : 'normal',
                      color: err ? '#f87171' : (th.mono ? '#FF6A00' : '#111'),
                      caretColor: '#FF6A00',
                    }}
                  />
                </HCard>
                {err && <p style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: th.mono ? 10 : 12, letterSpacing: th.mono ? '0.2em' : 'normal', color: '#f87171', textAlign: 'center' }}>{th.mono ? '// ACESSO NEGADO' : 'Senha incorreta'}</p>}
                <button onClick={login} style={{
                  width: '100%', padding: '12px 0',
                  fontFamily: th.mono ? 'monospace' : 'inherit',
                  fontSize: th.mono ? 11 : 14, letterSpacing: th.mono ? '0.3em' : 'normal',
                  fontWeight: 900, textTransform: th.mono ? 'uppercase' : 'none',
                  background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: th.mono ? '#000' : 'white',
                  border: 'none', borderRadius: th.mono ? 4 : 12, cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(255,106,0,0.35)',
                }}>
                  {th.mono ? 'ACESSAR SISTEMA' : 'Entrar'}
                </button>
              </div>
            </div>
          )}

          {/* ── AGENDA ── */}
          {auth && tab === 'agenda' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: th.mono ? '12px 16px' : '14px 20px', borderBottom: th.sectionBorder, flexShrink: 0 }}>
                {[
                  { label: th.mono ? 'HOJE'    : 'Hoje',     value: todayList.length,    color: '#FF6A00', glow: true },
                  { label: th.mono ? 'ATIVOS'  : 'Ativos',   value: activeList.length,   color: th.text },
                  { label: th.mono ? 'LIVRES'  : 'Livres',   value: freeTodaySlots.length, color: th.green },
                  { label: th.mono ? 'CANCEL.' : 'Cancelados', value: cancelledCount,    color: th.red },
                ].map(s => (
                  <HCard key={s.label} th={th} glow={s.glow} style={{ padding: th.mono ? '10px 8px' : '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: th.mono ? 'monospace' : 'inherit' }}>{s.value}</div>
                    <div style={{ ...th.monoSm, marginTop: 4 }}>{s.label}</div>
                  </HCard>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 6, padding: th.mono ? '8px 16px' : '10px 20px', borderBottom: th.sectionBorder, flexShrink: 0, flexWrap: 'wrap' }}>
                {[['today', th.mono ? 'HOJE' : 'Hoje'], ['active', th.mono ? 'ATIVOS' : 'Ativos'], ['cancelled', th.mono ? 'CANCEL.' : 'Cancelados'], ['all', th.mono ? 'TODOS' : 'Todos']].map(([f, l]) => (
                  <button key={f} onClick={() => setFilter(f)} style={th.pill(filter === f)}>{l}</button>
                ))}
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1, padding: th.mono ? 12 : '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.length === 0
                  ? <div style={{ textAlign: 'center', padding: '60px 0' }}><p style={{ ...th.monoSm }}>{th.mono ? '// SEM REGISTROS' : 'Nenhum agendamento'}</p></div>
                  : sorted.map(b => (
                    <BItem key={b.id} b={b} th={th}
                      onConfirm={async () => { await updateBookingStatus(b.id,'confirmed'); setBookings(await getBookedSlots()); toast.success('Confirmado') }}
                      onCancel={async () => { await cancelBooking(b.id); setBookings(await getBookedSlots()); toast.success('Cancelado') }}
                      onReschedule={async t => { await rescheduleBooking(b.id, t); setBookings(await getBookedSlots()); setReId(null); toast.success('Reagendado') }}
                      reMode={reId === b.id} onToggleRe={() => setReId(reId===b.id?null:b.id)}
                    />
                  ))}
              </div>

              {/* Free slots */}
              {filter === 'today' && freeTodaySlots.length > 0 && (
                <div style={{ padding: th.mono ? '10px 16px' : '12px 20px', borderTop: th.sectionBorder, flexShrink: 0 }}>
                  <p style={{ ...th.monoSm, marginBottom: 8 }}>{th.mono ? '// SLOTS LIVRES HOJE' : 'Horários disponíveis hoje'}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {freeTodaySlots.map(t => (
                      <span key={t} style={{ fontSize: th.mono ? 10 : 12, fontWeight: 700, fontFamily: th.mono ? 'monospace' : 'inherit', padding: '4px 10px', background: th.mono ? 'rgba(74,222,128,0.07)' : '#f0fdf4', border: th.mono ? '1px solid rgba(74,222,128,0.2)' : '1px solid #bbf7d0', color: th.green, borderRadius: th.mono ? 3 : 8 }}>{t}</span>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: th.mono ? 16 : '16px 20px', borderBottom: th.sectionBorder }}>
                <HCard th={th} glow style={{ padding: 16 }}>
                  <p style={{ ...th.monoSm, color: th.mono ? 'rgba(255,106,0,0.5)' : '#9ca3af', marginBottom: 8 }}>{th.mono ? 'RECEITA TOTAL' : 'Receita Total'}</p>
                  <p style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 22, fontWeight: 900, color: '#FF6A00' }}>R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                  <p style={{ ...th.monoSm, marginTop: 6 }}>{activeList.length} {th.mono ? 'agendamentos ativos' : 'ativos'}</p>
                </HCard>
                <HCard th={th} style={{ padding: 16 }}>
                  <p style={{ ...th.monoSm, marginBottom: 8 }}>{th.mono ? 'RECEITA HOJE' : 'Receita Hoje'}</p>
                  <p style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 22, fontWeight: 900, color: th.text }}>R$ {todayRevenue.toFixed(2).replace('.', ',')}</p>
                  <p style={{ ...th.monoSm, marginTop: 6 }}>{todayList.filter(b=>b.status!=='cancelled').length} hoje</p>
                </HCard>
              </div>

              {/* Service breakdown */}
              <div style={{ padding: th.mono ? 16 : '16px 20px', borderBottom: th.sectionBorder }}>
                <p style={{ ...th.monoSm, marginBottom: 12 }}>{th.mono ? '// SERVIÇOS MAIS AGENDADOS' : 'Serviços mais agendados'}</p>
                {Object.keys(serviceBreakdown).length === 0
                  ? <p style={th.monoSm}>{th.mono ? '// SEM DADOS' : 'Sem dados'}</p>
                  : Object.entries(serviceBreakdown).sort((a,b)=>b[1]-a[1]).map(([name,count]) => {
                    const pct = activeList.length > 0 ? Math.round((count/activeList.length)*100) : 0
                    return (
                      <div key={name} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 11, color: th.text, fontWeight: th.mono ? 400 : 600 }}>{name}</span>
                          <span style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 11, fontWeight: 900, color: '#FF6A00' }}>{count}x · {pct}%</span>
                        </div>
                        <div style={{ height: th.mono ? 3 : 5, background: th.mono ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderRadius: 4 }}>
                          <div style={{ height: th.mono ? 3 : 5, width: `${pct}%`, background: 'linear-gradient(90deg,#FF6A00,#FF8C00)', boxShadow: th.mono ? '0 0 6px rgba(255,106,0,0.5)' : 'none', borderRadius: 4, transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Export */}
              <div style={{ padding: th.mono ? 16 : '16px 20px', borderBottom: th.sectionBorder }}>
                <p style={{ ...th.monoSm, marginBottom: 12 }}>{th.mono ? '// EXPORTAR RELATÓRIO CSV' : 'Exportar relatório'}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
                  {[['DE', dateFrom, setDateFrom], ['ATÉ', dateTo, setDateTo]].map(([lbl, val, setter]) => (
                    <div key={lbl} style={{ flex: 1, minWidth: 120 }}>
                      <p style={{ ...th.monoSm, marginBottom: 4 }}>{lbl}</p>
                      <input type="date" value={val} onChange={e => setter(e.target.value)} style={{
                        width: '100%', background: th.inputBg, border: th.inputBorder,
                        borderRadius: th.mono ? 3 : 8, padding: '7px 10px', outline: 'none',
                        fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: th.mono ? 11 : 13,
                        color: th.mono ? '#FF6A00' : '#111', boxSizing: 'border-box',
                      }} />
                    </div>
                  ))}
                  <button onClick={() => exportCSV(rangeFiltered.length > 0 ? rangeFiltered : bookings, dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'todos')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: th.mono ? '#000' : 'white', border: 'none', borderRadius: th.mono ? 3 : 8, cursor: 'pointer', fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: th.mono ? 10 : 13, fontWeight: 900, letterSpacing: th.mono ? '0.2em' : 'normal', flexShrink: 0 }}>
                    <Download size={12} />{th.mono ? 'BAIXAR' : 'Baixar CSV'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['Hoje', () => exportCSV(todayList, format(new Date(),'dd-MM-yyyy'))],
                    ['Ativos', () => exportCSV(activeList,'ativos')],
                    ['Completo', () => exportCSV(bookings,'completo')]].map(([l, fn]) => (
                    <button key={l} onClick={fn} style={th.pill(false)}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Range list */}
              {dateFrom && dateTo && (
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ ...th.monoSm, padding: '0 4px' }}>{th.mono ? `// ${rangeFiltered.length} REGISTROS NO PERÍODO` : `${rangeFiltered.length} registros no período`}</p>
                  {rangeFiltered.length === 0
                    ? <p style={{ ...th.monoSm, textAlign: 'center', padding: '20px 0' }}>{th.mono ? '// SEM DADOS' : 'Sem dados'}</p>
                    : [...rangeFiltered].sort((a,b)=>(a.dateStr||'').localeCompare(b.dateStr||'')).map(b => (
                      <BItem key={b.id} b={b} th={th} readOnly onConfirm={async()=>{}} onCancel={async()=>{}} onReschedule={async()=>{}} reMode={false} onToggleRe={()=>{}} />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BItem({ b, onConfirm, onCancel, onReschedule, reMode, onToggleRe, readOnly, th }) {
  const cancelled = b.status === 'cancelled'
  let dateLabel = ''
  try { const d = parseISO(b.dateStr); dateLabel = isToday(d) ? (th.mono ? 'HOJE' : 'Hoje') : format(d, th.mono ? 'dd/MM' : "dd 'de' MMM", { locale: ptBR }) } catch {}

  return (
    <HCard th={th} glow={!cancelled} style={{ padding: 12, opacity: cancelled ? 0.4 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, background: th.mono ? 'rgba(255,106,0,0.08)' : '#fff7f0', border: th.mono ? '1px solid rgba(255,106,0,0.2)' : '1px solid #ffd4b0', borderRadius: th.mono ? 4 : 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={13} color="#FF6A00" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: th.mono ? 13 : 14, fontWeight: 700, color: th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{b.clientName}</p>
            <p style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 10, color: th.textMuted, margin: 0 }}>{b.clientPhone}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: th.mono ? 13 : 14, fontWeight: 900, color: '#FF6A00', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />{b.time}
          </div>
          <div style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 10, color: th.textMuted }}>{dateLabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: th.mono ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f3f4f6', marginBottom: !cancelled && !readOnly ? 8 : 0 }}>
        <Scissors size={10} color="#FF6A00" />
        <span style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 11, color: th.text, fontWeight: th.mono ? 400 : 500 }}>{b.service?.name}</span>
        <span style={{ fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 11, fontWeight: 900, color: '#FF6A00', marginLeft: 'auto' }}>{b.service?.priceDisplay}</span>
      </div>

      {!cancelled && !readOnly && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { l: th.mono ? 'OK' : 'Confirmar',  fn: onConfirm,   color: th.green, bg: th.mono ? 'rgba(74,222,128,0.07)' : '#f0fdf4',       bdr: th.mono ? 'rgba(74,222,128,0.2)'  : '#bbf7d0', Icon: Check },
            { l: th.mono ? 'REAGENDAR' : 'Reagendar', fn: onToggleRe, color: '#FF6A00', bg: th.mono ? 'rgba(255,106,0,0.07)' : '#fff7f0', bdr: th.mono ? 'rgba(255,106,0,0.2)'   : '#ffd4b0', Icon: RefreshCw },
            { l: th.mono ? 'CANCELAR'  : 'Cancelar',  fn: onCancel,   color: th.red,   bg: th.mono ? 'rgba(239,68,68,0.07)'  : '#fff0f0',  bdr: th.mono ? 'rgba(239,68,68,0.2)'   : '#fecaca', Icon: XCircle },
          ].map(({ l, fn, color, bg, bdr, Icon }) => (
            <button key={l} onClick={fn} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 0', background: bg, border: `1px solid ${bdr}`, color, borderRadius: th.mono ? 3 : 8, fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: th.mono ? 9 : 12, fontWeight: 700, letterSpacing: th.mono ? '0.1em' : 'normal', textTransform: th.mono ? 'uppercase' : 'none', cursor: 'pointer' }}>
              <Icon size={10} />{l}
            </button>
          ))}
        </div>
      )}

      {reMode && !readOnly && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, paddingTop: 8, borderTop: th.mono ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f3f4f6', marginTop: 8 }}>
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => onReschedule(t)} style={{
              padding: '5px 0', fontFamily: th.mono ? 'monospace' : 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer', borderRadius: th.mono ? 3 : 8,
              background: t === b.time ? (th.mono ? 'rgba(255,106,0,0.18)' : '#fff7f0') : (th.mono ? 'rgba(255,255,255,0.03)' : '#f9fafb'),
              border: t === b.time ? (th.mono ? '1px solid rgba(255,106,0,0.5)' : '1.5px solid #FF6A00') : (th.mono ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e5e7eb'),
              color: t === b.time ? '#FF6A00' : th.textSub,
            }}>{t}</button>
          ))}
        </div>
      )}
    </HCard>
  )
}
