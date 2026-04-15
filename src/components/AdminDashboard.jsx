import { useState, useMemo } from 'react'
import { X, Check, XCircle, RefreshCw, Calendar, User, Clock, Scissors, BarChart2, Download, TrendingUp, DollarSign, Filter } from 'lucide-react'
import { format, isToday, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getBookedSlots, cancelBooking, updateBookingStatus } from '../utils/calendar'
import { TIME_SLOTS } from '../data/services'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'vet997'

const S = {
  panel: { background: 'linear-gradient(160deg, #0a0a0a 0%, #111111 100%)', border: '1px solid rgba(255,106,0,0.2)', boxShadow: '0 0 60px rgba(255,106,0,0.08), 0 0 120px rgba(0,0,0,0.9)' },
  border: { borderColor: 'rgba(255,106,0,0.1)' },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' },
  cardActive: { background: 'rgba(255,106,0,0.08)', border: '1px solid rgba(255,106,0,0.2)' },
  btnActive: { background: 'rgba(255,106,0,0.15)', border: '1px solid rgba(255,106,0,0.4)', color: '#FF6A00' },
  btnInactive: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' },
  input: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,106,0,0.2)', color: 'white', borderRadius: '10px', padding: '8px 12px', outline: 'none', fontSize: '12px', width: '100%' },
}

function exportCSV(bookings, label) {
  const rows = [['Nome', 'Telefone', 'Serviço', 'Preço', 'Data', 'Hora', 'Status']]
  bookings.forEach(b => {
    rows.push([
      b.clientName || '',
      b.clientPhone || '',
      b.service?.name || '',
      b.service?.priceDisplay || '',
      b.dateStr || '',
      b.time || '',
      b.status || 'confirmado',
    ])
  })
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `r9-agendamentos-${label}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Relatório exportado!')
}

export default function AdminDashboard({ isOpen, onClose }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('agenda') // agenda | relatorio
  const [filter, setFilter] = useState('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rescheduleId, setRescheduleId] = useState(null)

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setBookings(getBookedSlots())
    } else {
      setPwError(true)
      setPassword('')
      setTimeout(() => setPwError(false), 1500)
    }
  }

  const handleRefresh = () => { setBookings(getBookedSlots()); toast.success('Atualizado') }
  const handleCancel = (id) => { cancelBooking(id); setBookings(getBookedSlots()); toast.success('Cancelado') }
  const handleConfirm = (id) => { updateBookingStatus(id, 'confirmed'); setBookings(getBookedSlots()); toast.success('Confirmado') }
  const handleReschedule = (id, newTime) => {
    const updated = bookings.map(b => b.id === id ? { ...b, time: newTime } : b)
    localStorage.setItem('r9_bookings', JSON.stringify(updated))
    setBookings(updated)
    setRescheduleId(null)
    toast.success('Reagendado')
  }

  if (!isOpen) return null

  const today = startOfDay(new Date())

  const filteredBookings = useMemo(() => bookings.filter(b => {
    if (filter === 'today') { try { return isToday(parseISO(b.dateStr)) } catch { return false } }
    if (filter === 'active') return b.status !== 'cancelled'
    if (filter === 'cancelled') return b.status === 'cancelled'
    if (filter === 'range' && dateFrom && dateTo) {
      try {
        const d = parseISO(b.dateStr)
        return isWithinInterval(d, { start: startOfDay(parseISO(dateFrom)), end: endOfDay(parseISO(dateTo)) })
      } catch { return false }
    }
    return true
  }), [bookings, filter, dateFrom, dateTo])

  const todayBookings = bookings.filter(b => { try { return isToday(parseISO(b.dateStr)) } catch { return false } })
  const activeBookings = bookings.filter(b => b.status !== 'cancelled')
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length
  const totalRevenue = activeBookings.reduce((acc, b) => acc + (b.service?.price || 0), 0)
  const todayRevenue = todayBookings.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + (b.service?.price || 0), 0)
  const bookedTodayTimes = todayBookings.map(b => b.time)
  const availableToday = TIME_SLOTS.filter(t => !bookedTodayTimes.includes(t))

  // Service breakdown
  const serviceBreakdown = activeBookings.reduce((acc, b) => {
    const name = b.service?.name || 'Outro'
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {})

  const filterLabel = filter === 'today' ? format(new Date(), 'dd-MM-yyyy') : filter === 'range' && dateFrom && dateTo ? `${dateFrom}_${dateTo}` : filter

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl flex flex-col max-h-screen sm:max-h-[92vh] sm:rounded-2xl overflow-hidden" style={S.panel}>
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.5) 2px,rgba(255,255,255,0.5) 3px)', backgroundSize: '100% 3px' }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Header bar */}
        <div className="relative flex items-center justify-between px-5 py-3 flex-shrink-0 border-b" style={S.border}>
          <div className="flex gap-1">
            {[['agenda', 'Agenda'], ['relatorio', 'Relatório']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all"
                style={tab === id ? S.btnActive : S.btnInactive}
              >{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={S.card}
              onMouseEnter={e => e.currentTarget.style.color = '#FF6A00'} onMouseLeave={e => e.currentTarget.style.color = ''}>
              <RefreshCw size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={S.card}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,106,0,0.4)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
              <X size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        </div>

        {!authenticated ? (
          <div className="relative flex flex-col items-center justify-center flex-1 p-10 gap-8">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.04) 0%, transparent 70%)' }} />
            <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" className="h-20 w-auto object-contain" />
            <div className="w-full max-w-xs space-y-3">
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full text-center text-white text-sm tracking-widest outline-none px-4 py-3 rounded-xl"
                style={{ border: pwError ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,106,0,0.25)', background: 'rgba(255,255,255,0.03)', letterSpacing: '0.3em' }}
              />
              <button onClick={handleLogin}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', boxShadow: '0 4px 20px rgba(255,106,0,0.25)', color: 'white' }}>
                Entrar
              </button>
            </div>
          </div>
        ) : tab === 'agenda' ? (
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 p-4 border-b flex-shrink-0" style={S.border}>
              <StatCard label="Hoje" value={todayBookings.length} color="#FF6A00" />
              <StatCard label="Ativos" value={activeBookings.length} color="rgba(255,255,255,0.8)" />
              <StatCard label="Livres" value={availableToday.length} color="#4ade80" />
              <StatCard label="Cancelados" value={cancelledCount} color="#f87171" />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0 flex-wrap" style={S.border}>
              {[['today','Hoje'],['active','Ativos'],['cancelled','Cancelados'],['all','Todos']].map(([f,l]) => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={filter === f ? S.btnActive : S.btnInactive}>{l}</button>
              ))}
            </div>

            {/* Bookings */}
            <div className="overflow-y-auto flex-1 no-scrollbar p-4 space-y-3">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar size={28} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>Nenhum agendamento</p>
                </div>
              ) : (
                [...filteredBookings].sort((a, b) => (a.dateStr || '').localeCompare(b.dateStr || '') || (a.time || '').localeCompare(b.time || '')).map(booking => (
                  <BookingItem key={booking.id} booking={booking}
                    onConfirm={() => handleConfirm(booking.id)}
                    onCancel={() => handleCancel(booking.id)}
                    onReschedule={time => handleReschedule(booking.id, time)}
                    isRescheduling={rescheduleId === booking.id}
                    onToggleReschedule={() => setRescheduleId(rescheduleId === booking.id ? null : booking.id)}
                  />
                ))
              )}
            </div>

            {/* Horários livres */}
            {filter === 'today' && availableToday.length > 0 && (
              <div className="border-t p-4 flex-shrink-0" style={S.border}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Horários Livres Hoje</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableToday.map(t => (
                    <span key={t} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* RELATÓRIO */
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Resumo financeiro */}
            <div className="grid grid-cols-2 gap-3 p-4 border-b flex-shrink-0" style={S.border}>
              <div className="rounded-xl p-4 space-y-1" style={S.cardActive}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,106,0,0.6)' }}>Receita Total</p>
                <p className="text-xl font-black" style={{ color: '#FF6A00' }}>R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{activeBookings.length} agendamentos ativos</p>
              </div>
              <div className="rounded-xl p-4 space-y-1" style={S.card}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Receita Hoje</p>
                <p className="text-xl font-black text-white">R$ {todayRevenue.toFixed(2).replace('.', ',')}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{todayBookings.filter(b => b.status !== 'cancelled').length} agendamentos hoje</p>
              </div>
            </div>

            {/* Serviços mais solicitados */}
            <div className="p-4 border-b flex-shrink-0" style={S.border}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Serviços mais agendados</p>
              <div className="space-y-2">
                {Object.entries(serviceBreakdown).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                  const pct = activeBookings.length > 0 ? Math.round((count / activeBookings.length) * 100) : 0
                  return (
                    <div key={name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-white">{name}</span>
                        <span className="text-xs" style={{ color: '#FF6A00' }}>{count}x · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#FF6A00,#FF8C00)' }} />
                      </div>
                    </div>
                  )
                })}
                {Object.keys(serviceBreakdown).length === 0 && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Nenhum dado ainda</p>
                )}
              </div>
            </div>

            {/* Exportar relatório */}
            <div className="p-4 flex-shrink-0 border-b" style={S.border}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Exportar relatório CSV</p>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>De</p>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={S.input} />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Até</p>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={S.input} />
                </div>
                <button
                  onClick={() => {
                    let data = bookings
                    if (dateFrom && dateTo) {
                      data = bookings.filter(b => {
                        try {
                          const d = parseISO(b.dateStr)
                          return isWithinInterval(d, { start: startOfDay(parseISO(dateFrom)), end: endOfDay(parseISO(dateTo)) })
                        } catch { return false }
                      })
                    }
                    exportCSV(data, dateFrom && dateTo ? `${dateFrom}_${dateTo}` : 'todos')
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg,#FF6A00,#FF8C00)', color: 'white', flexShrink: 0 }}
                >
                  <Download size={13} />
                  Baixar
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => exportCSV(todayBookings, format(new Date(), 'dd-MM-yyyy'))}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={S.btnInactive}>
                  Apenas hoje
                </button>
                <button onClick={() => exportCSV(activeBookings, 'ativos')}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={S.btnInactive}>
                  Todos ativos
                </button>
                <button onClick={() => exportCSV(bookings, 'completo')}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={S.btnInactive}>
                  Completo
                </button>
              </div>
            </div>

            {/* Lista filtrada por data */}
            {dateFrom && dateTo && (
              <div className="overflow-y-auto flex-1 no-scrollbar p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {filteredBookings.length} agendamentos no período
                </p>
                {filteredBookings.length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>Nenhum agendamento no período</p>
                ) : (
                  [...filteredBookings].sort((a, b) => (a.dateStr || '').localeCompare(b.dateStr || '')).map(booking => (
                    <BookingItem key={booking.id} booking={booking} readOnly
                      onConfirm={() => handleConfirm(booking.id)}
                      onCancel={() => handleCancel(booking.id)}
                      onReschedule={time => handleReschedule(booking.id, time)}
                      isRescheduling={rescheduleId === booking.id}
                      onToggleReschedule={() => setRescheduleId(rescheduleId === booking.id ? null : booking.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-3 text-center" style={S.card}>
      <div className="text-xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
    </div>
  )
}

function BookingItem({ booking, onConfirm, onCancel, onReschedule, isRescheduling, onToggleReschedule, readOnly }) {
  const isCancelled = booking.status === 'cancelled'
  let dateLabel = ''
  try {
    const d = parseISO(booking.dateStr)
    dateLabel = isToday(d) ? 'Hoje' : format(d, "dd/MM", { locale: ptBR })
  } catch {}

  return (
    <div className="rounded-xl p-4 space-y-3 transition-all duration-200"
      style={{ background: isCancelled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: isCancelled ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,106,0,0.12)', opacity: isCancelled ? 0.45 : 1 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <User size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate text-white">{booking.clientName}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{booking.clientPhone}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 font-bold text-sm" style={{ color: '#FF6A00' }}>
            <Clock size={12} />{booking.time}
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{dateLabel}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Scissors size={11} style={{ color: '#FF6A00', flexShrink: 0 }} />
        <span className="text-xs font-medium text-white">{booking.service?.name}</span>
        <span className="text-xs ml-auto font-semibold" style={{ color: '#FF6A00' }}>{booking.service?.priceDisplay}</span>
      </div>

      {!isCancelled && !readOnly && (
        <div className="flex gap-2 pt-1">
          <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
            <Check size={11} />OK
          </button>
          <button onClick={onToggleReschedule} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ background: 'rgba(255,106,0,0.08)', border: '1px solid rgba(255,106,0,0.2)', color: '#FF6A00' }}>
            <RefreshCw size={11} />Reagendar
          </button>
          <button onClick={onCancel} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            <XCircle size={11} />Cancelar
          </button>
        </div>
      )}

      {isRescheduling && !readOnly && (
        <div className="grid grid-cols-5 gap-1.5 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => onReschedule(t)} className="py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={t === booking.time
                ? { background: 'rgba(255,106,0,0.2)', border: '1px solid rgba(255,106,0,0.5)', color: '#FF6A00' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
