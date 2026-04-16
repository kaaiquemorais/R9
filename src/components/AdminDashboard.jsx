import { useState, useEffect } from 'react'
import { X, Check, XCircle, RefreshCw, Download, Users, Calendar, Clock, Scissors, Sun, Moon, Lock, Unlock, Trash2, User } from 'lucide-react'
import { format, isToday, isYesterday, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  getBookedSlots, cancelBooking, updateBookingStatus, rescheduleBooking,
  getBlockedSlots, blockSlot, unblockSlot, saveBooking,
} from '../utils/calendar'
import { supabase } from '../lib/supabase'
import { TIME_SLOTS, SERVICES } from '../data/services'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'vet997'

/* ══════════════════════════════════════════
   TOKENS DE TEMA
══════════════════════════════════════════ */
const themes = {
  dark: {
    bg:          '#0d0d0d',
    panel:       '#111',
    card:        '#1a1a1a',
    cardBorder:  '#2a2a2a',
    cardHover:   '#222',
    header:      '#111',
    headerBorder:'#222',
    divider:     '#222',
    text:        '#f0f0f0',
    textSub:     '#888',
    textMuted:   '#555',
    accent:      '#FF6A00',
    accentBg:    'rgba(255,106,0,0.12)',
    accentBorder:'rgba(255,106,0,0.3)',
    green:       '#4ade80',
    greenBg:     'rgba(74,222,128,0.1)',
    greenBorder: 'rgba(74,222,128,0.25)',
    red:         '#f87171',
    redBg:       'rgba(248,113,113,0.1)',
    redBorder:   'rgba(248,113,113,0.25)',
    amber:       '#fbbf24',
    amberBg:     'rgba(251,191,36,0.1)',
    amberBorder: 'rgba(251,191,36,0.25)',
    inputBg:     '#1a1a1a',
    inputBorder: '#333',
    shadow:      '0 24px 60px rgba(0,0,0,0.6)',
    panelBorder: '1px solid rgba(255,106,0,0.2)',
    topGlow:     true,
  },
  light: {
    bg:          '#f0f2f5',
    panel:       '#fff',
    card:        '#fff',
    cardBorder:  '#e8e8e8',
    cardHover:   '#fafafa',
    header:      '#fff',
    headerBorder:'#eeeeee',
    divider:     '#eeeeee',
    text:        '#111',
    textSub:     '#6b7280',
    textMuted:   '#9ca3af',
    accent:      '#FF6A00',
    accentBg:    '#fff4ee',
    accentBorder:'#ffd0b0',
    green:       '#16a34a',
    greenBg:     '#f0fdf4',
    greenBorder: '#bbf7d0',
    red:         '#dc2626',
    redBg:       '#fef2f2',
    redBorder:   '#fecaca',
    amber:       '#d97706',
    amberBg:     '#fffbeb',
    amberBorder: '#fde68a',
    inputBg:     '#f9fafb',
    inputBorder: '#e5e7eb',
    shadow:      '0 24px 60px rgba(0,0,0,0.1)',
    panelBorder: '1px solid #e8e8e8',
    topGlow:     false,
  },
}

function buildCalendarUrl(b) {
  try {
    const [h, m] = (b.time || '09:00').split(':').map(Number)
    const start = new Date(`${b.dateStr}T00:00:00`)
    start.setHours(h, m, 0, 0)
    const duration = b.service?.duration || 60
    const end = new Date(start.getTime() + duration * 60000)
    const fmt = d => d.toISOString().replace(/[-:]/g, '').slice(0, 15)
    const text = encodeURIComponent(`R9 Barbearia – ${b.service?.name || 'Atendimento'}`)
    const details = encodeURIComponent(`Cliente: ${b.clientName}\nTelefone: ${b.clientPhone}\nServiço: ${b.service?.name}\nValor: ${b.service?.priceDisplay}`)
    const location = encodeURIComponent('Rua Fernando de Noronha, 100, Bragança Paulista/SP')
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}&sf=true&output=xml`
  } catch { return null }
}

function svcName(b) { return (typeof b.service === 'object' ? b.service?.name : b.service) || '' }
function svcPrice(b) { return (typeof b.service === 'object' ? b.service?.priceDisplay : '') || '' }

function exportCSV(bookings, label) {
  const rows = [['Nome', 'Telefone', 'Serviço', 'Preço', 'Data', 'Hora', 'Status']]
  bookings.forEach(b => rows.push([b.clientName||'', b.clientPhone||'', svcName(b), svcPrice(b), b.dateStr||'', b.time||'', b.status||'confirmado']))
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`r9-${label}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV exportado!')
}

export default function AdminDashboard({ isOpen, onClose }) {
  const [auth, setAuth]         = useState(false)
  const [pw, setPw]             = useState('')
  const [err, setErr]           = useState(false)
  const [bookings, setBookings] = useState([])
  const [blocked, setBlocked]   = useState([])
  const [tab, setTab]           = useState('agenda')
  const [filter, setFilter]     = useState('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [reId, setReId]         = useState(null)
  const [theme, setTheme]       = useState('dark')

  // Bloqueios state
  const [blockDate, setBlockDate]   = useState('')
  const [blockAllDay, setBlockAllDay] = useState(true)
  const [blockTimes, setBlockTimes] = useState([])

  // Novo agendamento manual
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ clientName: '', clientPhone: '', serviceId: '', dateStr: '', time: '' })

  // Popup Google Calendar após confirmar
  const [calPopup, setCalPopup] = useState(null)

  const T = themes[theme]

  // Real-time: load + subscribe whenever authenticated and open
  useEffect(() => {
    if (!auth || !isOpen) return
    Promise.all([getBookedSlots(), getBlockedSlots()]).then(([b, bl]) => {
      setBookings(b); setBlocked(bl)
    })
    const channel = supabase
      .channel('admin-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        getBookedSlots().then(setBookings)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_slots' }, () => {
        getBlockedSlots().then(setBlocked)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [auth, isOpen])

  if (!isOpen) return null

  const login = async () => {
    if (pw === ADMIN_PASSWORD) {
      setAuth(true)
    } else { setErr(true); setPw(''); setTimeout(() => setErr(false), 1500) }
  }

  const refresh = async () => {
    const [b, bl] = await Promise.all([getBookedSlots(), getBlockedSlots()])
    setBookings(b); setBlocked(bl); toast.success('Atualizado!')
  }

  /* ── Computed ── */
  const todayList    = bookings.filter(b => { try { return isToday(parseISO(b.dateStr)) } catch { return false } })
  const activeList   = bookings.filter(b => b.status !== 'cancelled')
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length
  const totalRevenue = activeList.reduce((s, b) => s + (b.service?.price || 0), 0)
  const todayRevenue = todayList.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.service?.price || 0), 0)
  const freeTodaySlots = TIME_SLOTS.filter(t => !todayList.map(b => b.time).includes(t))

  const yesterdayList = bookings.filter(b => { try { return isYesterday(parseISO(b.dateStr)) } catch { return false } })

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const dayBookings = activeList.filter(b => b.dateStr === dateStr)
    return {
      dia: format(d, 'dd/MM'),
      agendamentos: dayBookings.length,
      receita: dayBookings.reduce((s, b) => s + (b.service?.price || 0), 0),
    }
  })

  const getFiltered = () => bookings.filter(b => {
    try {
      if (filter === 'today')     return isToday(parseISO(b.dateStr))
      if (filter === 'yesterday') return isYesterday(parseISO(b.dateStr))
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

  const serviceBreakdown = Object.entries(
    activeList.reduce((acc, b) => { const n = svcName(b)||'Outro'; acc[n]=(acc[n]||0)+1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])

  /* ── Block handlers ── */
  const handleBlock = async () => {
    if (!blockDate) { toast.error('Selecione uma data'); return }
    if (blockAllDay) {
      await blockSlot(blockDate, null)
      toast.success('Dia bloqueado!')
    } else {
      if (!blockTimes.length) { toast.error('Selecione ao menos um horário'); return }
      await Promise.all(blockTimes.map(t => blockSlot(blockDate, t)))
      toast.success(`${blockTimes.length} horário(s) bloqueado(s)!`)
    }
    setBlocked(await getBlockedSlots())
    setBlockTimes([])
  }

  const handleUnblock = async (id) => {
    await unblockSlot(id)
    setBlocked(await getBlockedSlots())
    toast.success('Desbloqueado!')
  }

  const toggleBlockTime = (t) =>
    setBlockTimes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleAddBooking = async () => {
    const { clientName, clientPhone, serviceId, dateStr, time } = addForm
    if (!clientName.trim() || !dateStr || !time || !serviceId) { toast.error('Preencha todos os campos'); return }
    const svc = SERVICES.find(s => s.id === Number(serviceId))
    const booking = {
      id: Date.now().toString(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      service: { name: svc?.name || serviceId, price: svc?.price || null, priceDisplay: svc?.priceDisplay || 'R$ Consultar', duration: svc?.duration || 60 },
      dateStr, time,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }
    await saveBooking(booking)
    setBookings(await getBookedSlots())
    setAddForm({ clientName: '', clientPhone: '', serviceId: '', dateStr: '', time: '' })
    setAddOpen(false)
    toast.success('Agendamento registrado!')
  }

  /* ── Shared style helpers ── */
  const card = (extra = {}) => ({
    background: T.card,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 12,
    ...extra,
  })

  const pill = (active, color = 'accent') => {
    const c = { accent: [T.accentBg, T.accent, T.accentBorder], green: [T.greenBg, T.green, T.greenBorder], red: [T.redBg, T.red, T.redBorder] }[color]
    return {
      padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: 'none',
      background: active ? c[0] : 'transparent',
      color: active ? c[1] : T.textSub,
      outline: active ? `1px solid ${c[2]}` : `1px solid transparent`,
      transition: 'all 0.15s',
    }
  }

  const iconBtn = { background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

  const sectionTitle = { fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: T.bg === '#0d0d0d' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>

      <div style={{ position: 'relative', width: '100%', maxWidth: 700, maxHeight: '94vh', display: 'flex', flexDirection: 'column', background: T.panel, borderRadius: 20, border: T.panelBorder, boxShadow: T.shadow, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Top accent */}
        {T.topGlow && <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #FF6A00, transparent)', flexShrink: 0 }} />}

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${T.headerBorder}`, background: T.header, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 24, objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3 }}>
                {auth ? 'Painel Admin' : 'R9 Barbearia'}
              </p>
              <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>
                {auth ? 'Gerencie seus agendamentos' : 'Acesso restrito'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {auth && <button style={iconBtn} onClick={refresh} title="Atualizar"><RefreshCw size={13} color={T.textSub} /></button>}
            <button style={iconBtn} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Alternar tema">
              {theme === 'dark' ? <Sun size={13} color={T.textSub} /> : <Moon size={13} color={T.textSub} />}
            </button>
            <button style={iconBtn} onClick={onClose} title="Fechar"><X size={13} color={T.textSub} /></button>
          </div>
        </div>

        {/* ── LOGIN ── */}
        {!auth && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '48px 40px' }}>
            <div style={{ width: 68, height: 68, borderRadius: 18, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
              <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 46, objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: '0 0 4px' }}>Bem-vindo</p>
              <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>Digite a senha para acessar o painel</p>
            </div>
            <div style={{ width: '100%', maxWidth: 290, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="password" value={pw}
                onChange={e => { setPw(e.target.value); setErr(false) }}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Senha"
                style={{ width: '100%', background: T.inputBg, border: `1.5px solid ${err ? T.red : T.inputBorder}`, borderRadius: 12, outline: 'none', padding: '13px 16px', fontSize: 15, color: T.text, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              />
              {err && <p style={{ fontSize: 12, color: T.red, textAlign: 'center', margin: 0 }}>Senha incorreta. Tente novamente.</p>}
              <button onClick={login} style={{ width: '100%', padding: '13px 0', fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,106,0,0.35)' }}>
                Entrar
              </button>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {auth && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.divider}`, background: T.header, flexShrink: 0 }}>
              {[['agenda','Agenda'],['relatorio','Relatório'],['bloqueios','Bloqueios']].map(([k,l]) => (
                <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', border: 'none', color: tab===k ? T.accent : T.textSub, borderBottom: `2px solid ${tab===k ? T.accent : 'transparent'}`, transition: 'all 0.15s' }}>{l}</button>
              ))}
            </div>

            {/* ── AGENDA ── */}
            {tab === 'agenda' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '16px 20px', flexShrink: 0 }}>
                  {[
                    { label: 'Hoje',      value: todayList.length,      bg: T.accentBg, border: T.accentBorder, color: T.accent },
                    { label: 'Ativos',    value: activeList.length,     bg: T.card,     border: T.cardBorder,   color: T.text },
                    { label: 'Disponíveis', value: freeTodaySlots.length, bg: T.greenBg, border: T.greenBorder, color: T.green },
                    { label: 'Cancelados', value: cancelledCount,        bg: T.redBg,   border: T.redBorder,    color: T.red },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                      <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: '0 0 2px', lineHeight: 1 }}>{s.value}</p>
                      <p style={{ fontSize: 11, color: T.textSub, margin: 0, fontWeight: 500 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filters + botão novo */}
                <div style={{ display: 'flex', gap: 6, padding: '0 20px 14px', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[['today','Hoje'],['yesterday','Ontem'],['active','Ativos'],['cancelled','Cancelados'],['all','Todos']].map(([f,l]) => (
                    <button key={f} onClick={() => setFilter(f)} style={pill(filter===f)}>{l}</button>
                  ))}
                  <button onClick={() => setAddOpen(o => !o)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent }}>
                    Agendar horário
                  </button>
                </div>

                {/* Formulário agendamento manual (WhatsApp) */}
                {addOpen && (
                  <div style={{ margin: '0 20px 14px', background: T.card, border: `1px solid ${T.accentBorder}`, borderRadius: 14, padding: 16, flexShrink: 0 }}>
                    <p style={{ ...sectionTitle, marginBottom: 14, color: T.accent }}>Agendar horário</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      <input placeholder="Nome do cliente" value={addForm.clientName} onChange={e => setAddForm(f => ({ ...f, clientName: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: T.text, outline: 'none' }} />
                      <input placeholder="WhatsApp" value={addForm.clientPhone} onChange={e => setAddForm(f => ({ ...f, clientPhone: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: T.text, outline: 'none' }} />
                      <select value={addForm.serviceId} onChange={e => setAddForm(f => ({ ...f, serviceId: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: T.text, outline: 'none' }}>
                        <option value="">Serviço</option>
                        {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <input type="date" value={addForm.dateStr} onChange={e => setAddForm(f => ({ ...f, dateStr: e.target.value }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: T.text, outline: 'none' }} />
                        <select value={addForm.time} onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: T.text, outline: 'none' }}>
                          <option value="">Horário</option>
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleAddBooking} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                        Salvar agendamento
                      </button>
                      <button onClick={() => setAddOpen(false)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textSub, borderRadius: 10, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sorted.length === 0
                    ? <div style={{ textAlign: 'center', padding: '60px 0', color: T.textMuted }}><Calendar size={32} color={T.cardBorder} style={{ margin: '0 auto 10px' }} /><p style={{ fontSize: 13, margin: 0 }}>Nenhum agendamento encontrado</p></div>
                    : sorted.map(b => (
                      <BookingCard key={b.id} b={b} T={T}
                        onConfirm={async () => {
                          await updateBookingStatus(b.id, 'confirmed')
                          setBookings(await getBookedSlots())
                          setCalPopup(b)
                        }}
                        onCancel={async () => { await cancelBooking(b.id); setBookings(await getBookedSlots()); toast.success('Cancelado') }}
                        onReschedule={async t => { await rescheduleBooking(b.id,t); setBookings(await getBookedSlots()); setReId(null); toast.success('Reagendado!') }}
                        reMode={reId===b.id} onToggleRe={() => setReId(reId===b.id?null:b.id)}
                      />
                    ))}
                </div>

                {/* Free slots */}
                {filter === 'today' && freeTodaySlots.length > 0 && (
                  <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.divider}`, flexShrink: 0 }}>
                    <p style={sectionTitle}>Horários disponíveis hoje</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {freeTodaySlots.map(t => (
                        <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', background: T.greenBg, border: `1px solid ${T.greenBorder}`, color: T.green, borderRadius: 8 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── RELATÓRIO ── */}
            {tab === 'relatorio' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Revenue cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Receita Total',  value: `R$ ${totalRevenue.toFixed(2).replace('.',',')}`, sub: `${activeList.length} agendamentos ativos`, bg: T.accentBg, border: T.accentBorder, color: T.accent },
                    { label: 'Receita Hoje',   value: `R$ ${todayRevenue.toFixed(2).replace('.',',')}`, sub: `${todayList.filter(b=>b.status!=='cancelled').length} agendamento(s) hoje`, bg: T.card, border: T.cardBorder, color: T.text },
                    { label: 'Cancelados',     value: cancelledCount, sub: 'total de cancelamentos', bg: T.redBg, border: T.redBorder, color: T.red },
                  ].map(c => (
                    <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: c.color, margin: '0 0 2px' }}>{c.label}</p>
                        <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>{c.sub}</p>
                      </div>
                      <p style={{ fontSize: 26, fontWeight: 800, color: c.color, margin: 0, flexShrink: 0 }}>{c.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div style={card({ padding: 16 })}>
                  <p style={sectionTitle}>Últimos 7 dias</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gAgenda" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder} vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 11, fill: T.textSub }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: T.textSub }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 12, color: T.text }}
                        formatter={(v, n) => [v, n === 'agendamentos' ? 'Agendamentos' : 'Receita (R$)']}
                      />
                      <Area type="monotone" dataKey="agendamentos" stroke="#FF6A00" strokeWidth={2} fill="url(#gAgenda)" dot={{ r: 3, fill: '#FF6A00' }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Services */}
                <div style={card({ padding: 16 })}>
                  <p style={sectionTitle}>Serviços mais agendados</p>
                  {serviceBreakdown.length === 0
                    ? <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Sem dados</p>
                    : serviceBreakdown.map(([name, count]) => {
                      const pct = activeList.length > 0 ? Math.round((count/activeList.length)*100) : 0
                      return (
                        <div key={name} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{count}× · {pct}%</span>
                          </div>
                          <div style={{ height: 5, background: T.cardBorder, borderRadius: 99 }}>
                            <div style={{ height: 5, width: `${pct}%`, background: 'linear-gradient(90deg,#FF6A00,#FF8C00)', borderRadius: 99, transition: 'width 0.6s' }} />
                          </div>
                        </div>
                      )
                    })}
                </div>

                {/* Lista de agendamentos com hora */}
                <div style={card({ padding: 16 })}>
                  <p style={sectionTitle}>Agendamentos ativos</p>
                  {activeList.length === 0
                    ? <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Nenhum agendamento ativo</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[...activeList].sort((a,b)=>(a.dateStr||'').localeCompare(b.dateStr||'')||(a.time||'').localeCompare(b.time||'')).map(b => (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10 }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>{b.clientName}</p>
                              <p style={{ fontSize: 11, color: T.textSub, margin: 0 }}>{svcName(b)} · {svcPrice(b)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: 13, fontWeight: 800, color: T.accent, margin: 0 }}>{b.time}</p>
                              <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>{b.dateStr}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Export */}
                <div style={card({ padding: 16 })}>
                  <p style={sectionTitle}>Exportar CSV</p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
                    {[['De', dateFrom, setDateFrom],['Até', dateTo, setDateTo]].map(([lbl,val,setter]) => (
                      <div key={lbl} style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ ...sectionTitle, marginBottom: 5 }}>{lbl}</p>
                        <input type="date" value={val} onChange={e=>setter(e.target.value)} style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: '9px 12px', outline: 'none', fontSize: 13, color: T.text, boxSizing: 'border-box' }} />
                      </div>
                    ))}
                    <button onClick={() => exportCSV(rangeFiltered.length>0?rangeFiltered:bookings, dateFrom&&dateTo?`${dateFrom}_${dateTo}`:'todos')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      <Download size={14} /> Baixar
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['Hoje', ()=>exportCSV(todayList,format(new Date(),'dd-MM-yyyy'))],['Ativos',()=>exportCSV(activeList,'ativos')],['Todos',()=>exportCSV(bookings,'completo')]].map(([l,fn]) => (
                      <button key={l} onClick={fn} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: T.card, border: `1px solid ${T.cardBorder}`, color: T.textSub }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── BLOQUEIOS ── */}
            {tab === 'bloqueios' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Novo bloqueio */}
                <div style={card({ padding: 16 })}>
                  <p style={sectionTitle}>Bloquear data ou horário</p>

                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, color: T.textSub, fontWeight: 600, marginBottom: 6 }}>Data</p>
                    <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)}
                      style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: '9px 12px', outline: 'none', fontSize: 13, color: T.text, width: '100%', boxSizing: 'border-box' }} />
                  </div>

                  {/* Toggle dia inteiro / horários */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setBlockAllDay(true)} style={pill(blockAllDay)}>Dia inteiro</button>
                    <button onClick={() => setBlockAllDay(false)} style={pill(!blockAllDay)}>Horários específicos</button>
                  </div>

                  {/* Seleção de horários */}
                  {!blockAllDay && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 12, color: T.textSub, fontWeight: 600, marginBottom: 8 }}>Selecione os horários a bloquear</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                        {TIME_SLOTS.map(t => {
                          const sel = blockTimes.includes(t)
                          return (
                            <button key={t} onClick={() => toggleBlockTime(t)} style={{ padding: '7px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 8, background: sel ? T.redBg : T.inputBg, border: `1.5px solid ${sel ? T.redBorder : T.inputBorder}`, color: sel ? T.red : T.textSub, transition: 'all 0.1s' }}>{t}</button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <button onClick={handleBlock} style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 700, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Lock size={14} /> {blockAllDay ? 'Bloquear dia inteiro' : `Bloquear ${blockTimes.length} horário(s)`}
                  </button>
                </div>

                {/* Lista de bloqueios ativos */}
                <div style={card({ padding: 16 })}>
                  <p style={sectionTitle}>Bloqueios ativos ({blocked.length})</p>
                  {blocked.length === 0
                    ? <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Nenhum bloqueio ativo</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[...blocked].sort((a,b) => (a.date_str||'').localeCompare(b.date_str||'')).map(bl => {
                          let label = ''
                          try { label = format(parseISO(bl.date_str), "dd 'de' MMM", { locale: ptBR }) } catch {}
                          return (
                            <div key={bl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.redBg, border: `1px solid ${T.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Lock size={13} color={T.red} />
                                </div>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>{label}</p>
                                  <p style={{ fontSize: 11, color: T.textSub, margin: 0 }}>{bl.time ? `Horário: ${bl.time}` : 'Dia inteiro bloqueado'}</p>
                                </div>
                              </div>
                              <button onClick={() => handleUnblock(bl.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'transparent', border: `1px solid ${T.cardBorder}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.textSub }}>
                                <Unlock size={12} /> Desbloquear
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Popup Google Calendar ── */}
      {calPopup && (() => {
        const url = buildCalendarUrl(calPopup)
        return (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 'inherit', padding: 24 }}>
            <div style={{ background: T.panel, border: `1px solid ${T.accentBorder}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={24} color="#4ade80" />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: '0 0 4px' }}>Agendamento confirmado!</p>
                <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>
                  {calPopup.clientName} — {calPopup.time}
                </p>
              </div>
              <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>
                Deseja salvar este horário no Google Agenda?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setCalPopup(null)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: '#fff', textDecoration: 'none' }}
                  >
                    <Calendar size={15} /> Sim, salvar no Google Agenda
                  </a>
                )}
                <button
                  onClick={() => setCalPopup(null)}
                  style={{ padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textSub, cursor: 'pointer' }}
                >
                  Não, obrigado
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function BookingCard({ b, T, onConfirm, onCancel, onReschedule, reMode, onToggleRe }) {
  const cancelled = b.status === 'cancelled'
  let dateLabel = ''
  try { const d = parseISO(b.dateStr); dateLabel = isToday(d) ? 'Hoje' : format(d, "dd 'de' MMM", { locale: ptBR }) } catch {}

  return (
    <div style={{ background: T.card, border: `1px solid ${cancelled ? T.cardBorder : T.accentBorder}`, borderRadius: 12, padding: 14, opacity: cancelled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: T.accentBg, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={15} color={T.accent} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{b.clientName}</p>
            <p style={{ fontSize: 12, color: T.textSub, margin: 0 }}>{b.clientPhone}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: T.accent, margin: 0 }}>{b.time}</p>
          <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>{dateLabel}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.inputBg, borderRadius: 8, padding: '8px 12px', marginBottom: cancelled ? 0 : 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Scissors size={12} color={T.textMuted} />
          <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{b.service?.name}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{b.service?.priceDisplay}</span>
      </div>

      {!cancelled && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { l: 'Confirmar', fn: onConfirm,   color: T.green,  bg: T.greenBg,  border: T.greenBorder,  Icon: Check },
            { l: 'Reagendar', fn: onToggleRe,  color: T.amber,  bg: T.amberBg,  border: T.amberBorder,  Icon: RefreshCw },
            { l: 'Cancelar',  fn: onCancel,    color: T.red,    bg: T.redBg,    border: T.redBorder,    Icon: XCircle },
          ].map(({ l, fn, color, bg, border, Icon }) => (
            <button key={l} onClick={fn} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', background: bg, border: `1px solid ${border}`, color, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Icon size={12} />{l}
            </button>
          ))}
        </div>
      )}

      {reMode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, paddingTop: 10, marginTop: 10, borderTop: `1px solid ${T.divider}` }}>
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => onReschedule(t)} style={{ padding: '6px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 8, background: t===b.time ? T.accentBg : T.inputBg, border: `1.5px solid ${t===b.time ? T.accent : T.inputBorder}`, color: t===b.time ? T.accent : T.textSub }}>{t}</button>
          ))}
        </div>
      )}
    </div>
  )
}
