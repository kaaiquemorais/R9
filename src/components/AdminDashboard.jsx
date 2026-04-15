import { useState } from 'react'
import { X, Check, XCircle, RefreshCw, Download, Users, Calendar, Clock, Scissors, TrendingUp, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, isToday, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns'
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
  const a = document.createElement('a'); a.href = url; a.download = `r9-${label}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success('Relatório exportado!')
}

function buildChartData(bookings, days) {
  const today = new Date()
  const start = subDays(today, days - 1)
  return eachDayOfInterval({ start, end: today }).map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayBookings = bookings.filter(b => b.dateStr === dayStr && b.status !== 'cancelled')
    return {
      date: format(day, days <= 7 ? 'EEE' : 'dd/MM', { locale: ptBR }),
      receita: dayBookings.reduce((acc, b) => acc + (b.service?.price || 0), 0),
      agendamentos: dayBookings.length,
    }
  })
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 13 }}>
      <p style={{ color: '#6b7280', marginBottom: 4, fontWeight: 600, textTransform: 'capitalize' }}>{label}</p>
      <p style={{ color: '#FF6A00', fontWeight: 800, fontSize: 15 }}>R$ {(payload[0]?.value || 0).toFixed(2).replace('.', ',')}</p>
      <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>{payload[1]?.value || 0} agendamentos</p>
    </div>
  )
}

export default function AdminDashboard({ isOpen, onClose }) {
  const [auth, setAuth] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('agenda')
  const [filter, setFilter] = useState('today')
  const [chartDays, setChartDays] = useState(7)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reId, setReId] = useState(null)

  if (!isOpen) return null

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuth(true); setBookings(getBookedSlots()) }
    else { setErr(true); setPw(''); setTimeout(() => setErr(false), 1500) }
  }

  const refresh = () => { setBookings(getBookedSlots()); toast.success('Atualizado!') }

  const todayList = bookings.filter(b => { try { return isToday(parseISO(b.dateStr)) } catch { return false } })
  const activeList = bookings.filter(b => b.status !== 'cancelled')
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length
  const totalRevenue = activeList.reduce((a, b) => a + (b.service?.price || 0), 0)
  const todayRevenue = todayList.filter(b => b.status !== 'cancelled').reduce((a, b) => a + (b.service?.price || 0), 0)
  const freeTodaySlots = TIME_SLOTS.filter(t => !todayList.map(b => b.time).includes(t))

  const getFiltered = () => bookings.filter(b => {
    try {
      if (filter === 'today') return isToday(parseISO(b.dateStr))
      if (filter === 'active') return b.status !== 'cancelled'
      if (filter === 'cancelled') return b.status === 'cancelled'
      if (filter === 'range' && dateFrom && dateTo)
        return isWithinInterval(parseISO(b.dateStr), { start: startOfDay(parseISO(dateFrom)), end: endOfDay(parseISO(dateTo)) })
      return true
    } catch { return false }
  })

  const sorted = [...getFiltered()].sort((a, b) =>
    (a.dateStr || '').localeCompare(b.dateStr || '') || (a.time || '').localeCompare(b.time || ''))

  const serviceBreakdown = Object.entries(
    activeList.reduce((acc, b) => { const n = b.service?.name || 'Outro'; acc[n] = (acc[n] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])

  const chartData = buildChartData(bookings, chartDays)

  const rangeFiltered = bookings.filter(b => {
    if (!dateFrom || !dateTo) return false
    try { return isWithinInterval(parseISO(b.dateStr), { start: startOfDay(parseISO(dateFrom)), end: endOfDay(parseISO(dateTo)) }) }
    catch { return false }
  })

  /* ── shared styles ── */
  const card = { background: 'white', borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
  const pill = (active) => ({
    padding: '6px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none',
    background: active ? '#FF6A00' : '#f3f4f6',
    color: active ? 'white' : '#6b7280',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 740, maxHeight: '94vh',
        display: 'flex', flexDirection: 'column',
        background: '#f8f9fa', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'white', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0, lineHeight: 1.2 }}>R9 Barbearia</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{auth ? 'Painel Administrativo' : 'Acesso restrito'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {auth && (
              <button onClick={refresh} style={{ width: 36, height: 36, borderRadius: 10, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <RefreshCw size={15} color="#6b7280" />
              </button>
            )}
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="#6b7280" />
            </button>
          </div>
        </div>

        {/* ── LOGIN ── */}
        {!auth && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '48px 40px', gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 48, objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>Bem-vindo</p>
              <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Digite sua senha para continuar</p>
            </div>
            <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="password" value={pw}
                onChange={e => { setPw(e.target.value); setErr(false) }}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Senha"
                style={{
                  width: '100%', background: 'white', border: err ? '1.5px solid #f87171' : '1.5px solid #e5e7eb',
                  borderRadius: 12, outline: 'none', padding: '14px 16px',
                  fontSize: 15, color: '#111', boxSizing: 'border-box',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'border-color 0.2s',
                }}
              />
              {err && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontSize: 13 }}>
                  <AlertCircle size={14} /> Senha incorreta
                </div>
              )}
              <button onClick={login} style={{
                width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 700,
                background: '#FF6A00', color: 'white', border: 'none', borderRadius: 12,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,106,0,0.3)',
              }}>
                Entrar
              </button>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {auth && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '12px 24px', background: 'white', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
              {[['agenda', 'Agenda'], ['relatorio', 'Relatório']].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  ...pill(tab === key), padding: '8px 20px',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── AGENDA ── */}
            {tab === 'agenda' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '16px 24px', flexShrink: 0 }}>
                  {[
                    { label: 'Hoje', value: todayList.length, icon: <Calendar size={16} color="#FF6A00" />, bg: '#fff7f0', border: '#ffe4cc' },
                    { label: 'Ativos', value: activeList.length, icon: <Users size={16} color="#6366f1" />, bg: '#f0f0ff', border: '#ddd6fe' },
                    { label: 'Horários livres', value: freeTodaySlots.length, icon: <Clock size={16} color="#10b981" />, bg: '#f0fdf4', border: '#bbf7d0' },
                    { label: 'Cancelados', value: cancelledCount, icon: <XCircle size={16} color="#f87171" />, bg: '#fff0f0', border: '#fecaca' },
                  ].map(s => (
                    <div key={s.label} style={{ ...card, background: s.bg, border: `1px solid ${s.border}`, padding: '14px 12px' }}>
                      <div style={{ marginBottom: 8 }}>{s.icon}</div>
                      <p style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 2px', lineHeight: 1 }}>{s.value}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: 0, fontWeight: 500 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 6, padding: '0 24px 14px', flexShrink: 0 }}>
                  {[['today', 'Hoje'], ['active', 'Ativos'], ['cancelled', 'Cancelados'], ['all', 'Todos']].map(([f, l]) => (
                    <button key={f} onClick={() => setFilter(f)} style={pill(filter === f)}>{l}</button>
                  ))}
                </div>

                {/* List */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sorted.length === 0
                    ? (
                      <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                        <Calendar size={36} color="#e5e7eb" style={{ margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Nenhum agendamento</p>
                      </div>
                    )
                    : sorted.map(b => (
                      <BItem key={b.id} b={b}
                        onConfirm={() => { updateBookingStatus(b.id, 'confirmed'); setBookings(getBookedSlots()); toast.success('Confirmado!') }}
                        onCancel={() => { cancelBooking(b.id); setBookings(getBookedSlots()); toast.success('Cancelado') }}
                        onReschedule={t => { const u = bookings.map(x => x.id === b.id ? { ...x, time: t } : x); localStorage.setItem('r9_bookings', JSON.stringify(u)); setBookings(u); setReId(null); toast.success('Reagendado!') }}
                        reMode={reId === b.id}
                        onToggleRe={() => setReId(reId === b.id ? null : b.id)}
                      />
                    ))}
                </div>

                {/* Free slots */}
                {filter === 'today' && freeTodaySlots.length > 0 && (
                  <div style={{ padding: '14px 24px', background: 'white', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Horários disponíveis hoje</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {freeTodaySlots.map(t => (
                        <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── RELATÓRIO ── */}
            {tab === 'relatorio' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Revenue cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Receita total', value: `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, sub: `${activeList.length} agendamentos ativos`, accent: '#FF6A00', bg: '#fff7f0', border: '#ffe4cc' },
                    { label: 'Receita hoje', value: `R$ ${todayRevenue.toFixed(2).replace('.', ',')}`, sub: `${todayList.filter(b => b.status !== 'cancelled').length} hoje`, accent: '#6366f1', bg: '#f0f0ff', border: '#ddd6fe' },
                    { label: 'Cancelamentos', value: cancelledCount, sub: 'agendamentos perdidos', accent: '#f87171', bg: '#fff0f0', border: '#fecaca' },
                  ].map(c => (
                    <div key={c.label} style={{ ...card, background: c.bg, border: `1px solid ${c.border}`, padding: '16px' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>{c.label}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: c.accent, margin: '0 0 4px' }}>{c.value}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{c.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div style={{ ...card, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 2px' }}>Receita por dia</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Comparativo de faturamento</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
                      {[7, 14, 30].map(d => (
                        <button key={d} onClick={() => setChartDays(d)} style={{
                          padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: 'none',
                          background: chartDays === d ? 'white' : 'transparent',
                          color: chartDays === d ? '#FF6A00' : '#9ca3af',
                          boxShadow: chartDays === d ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s',
                        }}>{d}d</button>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 4, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="receita" stroke="#FF6A00" strokeWidth={2.5} fill="url(#grad)"
                        dot={{ fill: 'white', stroke: '#FF6A00', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#FF6A00', stroke: 'white', strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="agendamentos" stroke="#e5e7eb" strokeWidth={1.5} fill="none" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Service breakdown */}
                <div style={{ ...card, padding: '20px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 16px' }}>Serviços populares</p>
                  {serviceBreakdown.length === 0
                    ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Sem dados ainda</p>
                    : serviceBreakdown.map(([name, count]) => {
                      const pct = activeList.length > 0 ? Math.round((count / activeList.length) * 100) : 0
                      return (
                        <div key={name} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#FF6A00' }}>{count}× · {pct}%</span>
                          </div>
                          <div style={{ height: 6, background: '#f3f4f6', borderRadius: 999 }}>
                            <div style={{ height: 6, width: `${pct}%`, background: 'linear-gradient(90deg,#FF6A00,#FF8C00)', borderRadius: 999, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                </div>

                {/* Export */}
                <div style={{ ...card, padding: '20px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 16px' }}>Exportar relatório</p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                    {[['De', dateFrom, setDateFrom], ['Até', dateTo, setDateTo]].map(([lbl, val, setter]) => (
                      <div key={lbl} style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>{lbl}</p>
                        <input type="date" value={val} onChange={e => setter(e.target.value)} style={{
                          width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb',
                          borderRadius: 10, padding: '10px 12px', outline: 'none',
                          fontSize: 13, color: '#111', boxSizing: 'border-box',
                        }} />
                      </div>
                    ))}
                    <button onClick={() => exportCSV(rangeFiltered.length > 0 ? rangeFiltered : bookings, dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'todos')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#FF6A00', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 10px rgba(255,106,0,0.3)' }}>
                      <Download size={14} /> Baixar CSV
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['Hoje', () => exportCSV(todayList, format(new Date(), 'dd-MM-yyyy'))],
                      ['Ativos', () => exportCSV(activeList, 'ativos')],
                      ['Todos', () => exportCSV(bookings, 'completo')]].map(([l, fn]) => (
                      <button key={l} onClick={fn} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#f3f4f6', border: 'none', color: '#6b7280' }}>{l}</button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BItem({ b, onConfirm, onCancel, onReschedule, reMode, onToggleRe }) {
  const cancelled = b.status === 'cancelled'
  let dateLabel = ''
  try { const d = parseISO(b.dateStr); dateLabel = isToday(d) ? 'Hoje' : format(d, "dd 'de' MMM", { locale: ptBR }) } catch {}

  return (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 14, padding: 16, opacity: cancelled ? 0.55 : 1, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff7f0', border: '1px solid #ffe4cc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>✂️</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 2px' }}>{b.clientName}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{b.clientPhone}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#FF6A00', margin: '0 0 2px' }}>{b.time}</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{dateLabel}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderRadius: 10, padding: '8px 12px', marginBottom: !cancelled ? 12 : 0 }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{b.service?.name}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>{b.service?.priceDisplay}</span>
      </div>

      {!cancelled && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { l: 'Confirmar', fn: onConfirm, color: '#16a34a', bg: '#f0fdf4', bdr: '#bbf7d0', Icon: Check },
            { l: 'Reagendar', fn: onToggleRe, color: '#d97706', bg: '#fffbeb', bdr: '#fde68a', Icon: RefreshCw },
            { l: 'Cancelar', fn: onCancel, color: '#dc2626', bg: '#fff0f0', bdr: '#fecaca', Icon: XCircle },
          ].map(({ l, fn, color, bg, bdr, Icon }) => (
            <button key={l} onClick={fn} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', background: bg, border: `1px solid ${bdr}`, color, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Icon size={13} />{l}
            </button>
          ))}
        </div>
      )}

      {reMode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, paddingTop: 12, marginTop: 12, borderTop: '1px solid #f0f0f0' }}>
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => onReschedule(t)} style={{
              padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 8,
              background: t === b.time ? '#fff7f0' : '#f9fafb',
              border: t === b.time ? '1.5px solid #FF6A00' : '1px solid #e5e7eb',
              color: t === b.time ? '#FF6A00' : '#6b7280',
            }}>{t}</button>
          ))}
        </div>
      )}
    </div>
  )
}
