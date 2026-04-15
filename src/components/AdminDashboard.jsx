import { useState, useEffect } from 'react'
import { X, Check, XCircle, RefreshCw, Download, Users, Calendar, TrendingUp, Clock, Scissors, ChevronDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, isToday, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getBookedSlots, cancelBooking, updateBookingStatus } from '../utils/calendar'
import { TIME_SLOTS } from '../data/services'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'vet997'

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' },
  panel: {
    position: 'relative', width: '100%', maxWidth: 720, maxHeight: '92vh',
    display: 'flex', flexDirection: 'column',
    background: '#111', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,106,0,0.08)',
    overflow: 'hidden',
  },
}

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
  const range = eachDayOfInterval({ start, end: today })
  return range.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayBookings = bookings.filter(b => b.dateStr === dayStr && b.status !== 'cancelled')
    const revenue = dayBookings.reduce((acc, b) => acc + (b.service?.price || 0), 0)
    return {
      date: format(day, 'dd/MM', { locale: ptBR }),
      receita: revenue,
      agendamentos: dayBookings.length,
    }
  })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,106,0,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>{label}</p>
      <p style={{ color: '#FF6A00', fontWeight: 700 }}>R$ {payload[0]?.value?.toFixed(2).replace('.', ',')}</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{payload[1]?.value} agendamentos</p>
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

  const refresh = () => { setBookings(getBookedSlots()); toast.success('Sincronizado') }

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

  return (
    <div style={S.overlay}>
      <div style={S.backdrop} onClick={onClose} />
      <div style={S.panel}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>
              {auth ? 'Painel Admin' : 'Acesso Restrito'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {auth && (
              <button onClick={refresh} title="Sincronizar" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <RefreshCw size={14} color="rgba(255,255,255,0.5)" />
              </button>
            )}
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
        </div>

        {/* ── LOGIN ── */}
        {!auth && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24, padding: '48px 40px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,106,0,0.1)', border: '1px solid rgba(255,106,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
            </div>
            <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="password" value={pw}
                onChange={e => { setPw(e.target.value); setErr(false) }}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Senha"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: err ? '1px solid rgba(248,113,113,0.6)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, outline: 'none', padding: '13px 16px',
                  fontSize: 15, color: 'white', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />
              {err && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center', margin: 0 }}>Senha incorreta</p>}
              <button onClick={login} style={{
                width: '100%', padding: '13px 0', fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: '#000',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(255,106,0,0.3)',
              }}>
                Entrar
              </button>
            </div>
          </div>
        )}

        {/* ── TABS ── */}
        {auth && (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {[['agenda', 'Agenda'], ['relatorio', 'Relatório']].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: 'transparent', border: 'none',
                  color: tab === key ? '#FF6A00' : 'rgba(255,255,255,0.35)',
                  borderBottom: tab === key ? '2px solid #FF6A00' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── AGENDA ── */}
            {tab === 'agenda' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  {[
                    { label: 'Hoje', value: todayList.length, icon: <Calendar size={14} color="#FF6A00" />, color: '#FF6A00' },
                    { label: 'Ativos', value: activeList.length, icon: <Users size={14} color="rgba(255,255,255,0.5)" />, color: 'white' },
                    { label: 'Slots livres', value: freeTodaySlots.length, icon: <Clock size={14} color="#4ade80" />, color: '#4ade80' },
                    { label: 'Cancelados', value: cancelledCount, icon: <XCircle size={14} color="#f87171" />, color: '#f87171' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{s.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 6, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  {[['today', 'Hoje'], ['active', 'Ativos'], ['cancelled', 'Cancelados'], ['all', 'Todos']].map(([f, l]) => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                      background: filter === f ? 'rgba(255,106,0,0.15)' : 'rgba(255,255,255,0.04)',
                      border: filter === f ? '1px solid rgba(255,106,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      color: filter === f ? '#FF6A00' : 'rgba(255,255,255,0.4)',
                    }}>{l}</button>
                  ))}
                </div>

                {/* List */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sorted.length === 0
                    ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Nenhum agendamento encontrado</div>
                    : sorted.map(b => (
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
                  <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horários disponíveis hoje</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {freeTodaySlots.map(t => (
                        <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ade80', borderRadius: 6 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── RELATÓRIO ── */}
            {tab === 'relatorio' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>

                {/* Revenue cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { label: 'Receita total', value: `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, sub: `${activeList.length} agendamentos`, color: '#FF6A00', glow: true },
                    { label: 'Receita hoje', value: `R$ ${todayRevenue.toFixed(2).replace('.', ',')}`, sub: `${todayList.filter(b => b.status !== 'cancelled').length} hoje`, color: 'white' },
                    { label: 'Cancelamentos', value: cancelledCount, sub: 'total geral', color: '#f87171' },
                  ].map(c => (
                    <div key={c.label} style={{ background: c.glow ? 'rgba(255,106,0,0.06)' : 'rgba(255,255,255,0.03)', border: c.glow ? '1px solid rgba(255,106,0,0.2)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: c.color, marginBottom: 4 }}>{c.value}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{c.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>Receita por dia</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Comparativo de faturamento</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[7, 14, 30].map(d => (
                        <button key={d} onClick={() => setChartDays(d)} style={{
                          padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: chartDays === d ? 'rgba(255,106,0,0.15)' : 'rgba(255,255,255,0.04)',
                          border: chartDays === d ? '1px solid rgba(255,106,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                          color: chartDays === d ? '#FF6A00' : 'rgba(255,255,255,0.4)',
                        }}>{d}d</button>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="receita" stroke="#FF6A00" strokeWidth={2} fill="url(#colorReceita)" dot={{ fill: '#FF6A00', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: '#FF6A00' }} />
                      <Area type="monotone" dataKey="agendamentos" stroke="rgba(255,255,255,0.15)" strokeWidth={1} fill="none" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Service breakdown */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>Serviços mais agendados</p>
                  {serviceBreakdown.length === 0
                    ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Sem dados</p>
                    : serviceBreakdown.map(([name, count]) => {
                      const pct = activeList.length > 0 ? Math.round((count / activeList.length) * 100) : 0
                      return (
                        <div key={name} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#FF6A00' }}>{count}× · {pct}%</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                            <div style={{ height: 4, width: `${pct}%`, background: 'linear-gradient(90deg,#FF6A00,#FF8C00)', borderRadius: 4, transition: 'width 0.6s' }} />
                          </div>
                        </div>
                      )
                    })}
                </div>

                {/* Export */}
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>Exportar relatório CSV</p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                    {[['De', dateFrom, setDateFrom], ['Até', dateTo, setDateTo]].map(([lbl, val, setter]) => (
                      <div key={lbl} style={{ flex: 1, minWidth: 120 }}>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{lbl}</p>
                        <input type="date" value={val} onChange={e => setter(e.target.value)} style={{
                          width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, padding: '9px 12px', outline: 'none',
                          fontSize: 13, color: 'white', boxSizing: 'border-box',
                        }} />
                      </div>
                    ))}
                    <button
                      onClick={() => exportCSV(rangeFiltered.length > 0 ? rangeFiltered : bookings, dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'todos')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      <Download size={14} /> Baixar
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['Hoje', () => exportCSV(todayList, format(new Date(), 'dd-MM-yyyy'))],
                      ['Ativos', () => exportCSV(activeList, 'ativos')],
                      ['Todos', () => exportCSV(bookings, 'completo')]].map(([l, fn]) => (
                      <button key={l} onClick={fn} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{l}</button>
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
    <div style={{ background: cancelled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, opacity: cancelled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{b.clientName}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{b.clientPhone}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#FF6A00' }}>{b.time}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{dateLabel}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: !cancelled ? '1px solid rgba(255,255,255,0.05)' : 'none', marginBottom: !cancelled ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Scissors size={12} color="rgba(255,255,255,0.3)" />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{b.service?.name}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#FF6A00' }}>{b.service?.priceDisplay}</span>
      </div>

      {!cancelled && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { l: 'Confirmar', fn: onConfirm, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', bdr: 'rgba(74,222,128,0.15)', Icon: Check },
            { l: 'Reagendar', fn: onToggleRe, color: '#FF6A00', bg: 'rgba(255,106,0,0.08)', bdr: 'rgba(255,106,0,0.15)', Icon: RefreshCw },
            { l: 'Cancelar', fn: onCancel, color: '#f87171', bg: 'rgba(239,68,68,0.08)', bdr: 'rgba(239,68,68,0.15)', Icon: XCircle },
          ].map(({ l, fn, color, bg, bdr, Icon }) => (
            <button key={l} onClick={fn} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', background: bg, border: `1px solid ${bdr}`, color, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Icon size={12} />{l}
            </button>
          ))}
        </div>
      )}

      {reMode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, paddingTop: 10, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => onReschedule(t)} style={{
              padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 6,
              background: t === b.time ? 'rgba(255,106,0,0.15)' : 'rgba(255,255,255,0.03)',
              border: t === b.time ? '1px solid rgba(255,106,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
              color: t === b.time ? '#FF6A00' : 'rgba(255,255,255,0.35)',
            }}>{t}</button>
          ))}
        </div>
      )}
    </div>
  )
}
