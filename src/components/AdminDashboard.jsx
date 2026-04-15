import { useState } from 'react'
import { X, Check, XCircle, RefreshCw, Calendar, User, Clock, Scissors, ChevronDown, BarChart2 } from 'lucide-react'
import { format, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getBookedSlots, cancelBooking, updateBookingStatus } from '../utils/calendar'
import { TIME_SLOTS } from '../data/services'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'vet997'

export default function AdminDashboard({ isOpen, onClose }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('today')
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

  const handleRefresh = () => {
    setBookings(getBookedSlots())
    toast.success('Lista atualizada')
  }

  const handleCancel = (id) => {
    cancelBooking(id)
    setBookings(getBookedSlots())
    toast.success('Agendamento cancelado')
  }

  const handleConfirm = (id) => {
    updateBookingStatus(id, 'confirmed')
    setBookings(getBookedSlots())
    toast.success('Agendamento confirmado')
  }

  const handleReschedule = (id, newTime) => {
    const updated = bookings.map((b) => b.id === id ? { ...b, time: newTime } : b)
    localStorage.setItem('r9_bookings', JSON.stringify(updated))
    setBookings(updated)
    setRescheduleId(null)
    toast.success('Horário reagendado')
  }

  if (!isOpen) return null

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'today') {
      try { return isToday(parseISO(b.dateStr)) } catch { return false }
    }
    if (filter === 'all') return true
    if (filter === 'pending') return b.status !== 'cancelled'
    return true
  })

  const todayCount = bookings.filter((b) => {
    try { return isToday(parseISO(b.dateStr)) } catch { return false }
  }).length

  const bookedToday = filteredBookings.filter(() => filter === 'today').map(b => b.time)
  const availableToday = TIME_SLOTS.filter(t => !bookedToday.includes(t))

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-2xl flex flex-col max-h-screen sm:max-h-[90vh] sm:rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0a0a0a 0%, #111111 100%)',
          border: '1px solid rgba(255,106,0,0.2)',
          boxShadow: '0 0 60px rgba(255,106,0,0.08), 0 0 120px rgba(0,0,0,0.9)',
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)',
            backgroundSize: '100% 3px',
          }}
        />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-end px-6 py-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,106,0,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
          >
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        {!authenticated ? (
          /* LOGIN */
          <div className="relative flex flex-col items-center justify-center flex-1 p-10 gap-8">
            {/* Glow center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.04) 0%, transparent 70%)' }} />

            <img src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png" alt="R9" className="h-20 w-auto object-contain" />

            <div className="w-full max-w-xs space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full bg-transparent text-center text-white text-sm tracking-widest outline-none px-4 py-3 rounded-xl transition-all duration-200"
                style={{
                  border: pwError ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,106,0,0.25)',
                  boxShadow: pwError ? '0 0 0 3px rgba(239,68,68,0.08)' : '0 0 0 1px rgba(255,106,0,0.05) inset',
                  background: 'rgba(255,255,255,0.03)',
                  letterSpacing: '0.3em',
                }}
              />
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #FF6A00, #FF8C00)',
                  boxShadow: '0 4px 20px rgba(255,106,0,0.25)',
                  color: 'white',
                }}
              >
                Entrar
              </button>
            </div>
          </div>
        ) : (
          /* DASHBOARD */
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 p-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,106,0,0.1)' }}>
              <StatCard label="Hoje" value={todayCount} color="#FF6A00" />
              <StatCard label="Total" value={bookings.length} color="rgba(255,255,255,0.7)" />
              <StatCard label="Livres" value={availableToday.length} color="#4ade80" />
            </div>

            {/* Filter + Refresh */}
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,106,0,0.1)' }}>
              <div className="flex gap-2">
                {['today', 'all', 'pending'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200"
                    style={filter === f
                      ? { background: 'rgba(255,106,0,0.15)', border: '1px solid rgba(255,106,0,0.4)', color: '#FF6A00' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                    }
                  >
                    {f === 'today' ? 'Hoje' : f === 'all' ? 'Todos' : 'Ativos'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#FF6A00'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                <RefreshCw size={12} />
                Atualizar
              </button>
            </div>

            {/* Bookings List */}
            <div className="overflow-y-auto flex-1 no-scrollbar p-4 space-y-3">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar size={28} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>Nenhum agendamento</p>
                </div>
              ) : (
                filteredBookings
                  .sort((a, b) => a.time?.localeCompare(b.time))
                  .map((booking) => (
                    <BookingItem
                      key={booking.id}
                      booking={booking}
                      onConfirm={() => handleConfirm(booking.id)}
                      onCancel={() => handleCancel(booking.id)}
                      onReschedule={(time) => handleReschedule(booking.id, time)}
                      isRescheduling={rescheduleId === booking.id}
                      onToggleReschedule={() => setRescheduleId(rescheduleId === booking.id ? null : booking.id)}
                    />
                  ))
              )}
            </div>

            {/* Available Slots Today */}
            {filter === 'today' && availableToday.length > 0 && (
              <div className="border-t p-4 flex-shrink-0" style={{ borderColor: 'rgba(255,106,0,0.1)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Horários Livres
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableToday.map((t) => (
                    <span key={t} className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
    </div>
  )
}

function BookingItem({ booking, onConfirm, onCancel, onReschedule, isRescheduling, onToggleReschedule }) {
  const isCancelled = booking.status === 'cancelled'

  let dateLabel = ''
  try {
    const d = parseISO(booking.dateStr)
    dateLabel = isToday(d) ? 'Hoje' : format(d, "dd/MM", { locale: ptBR })
  } catch {}

  return (
    <div
      className="rounded-xl p-4 space-y-3 transition-all duration-200"
      style={{
        background: isCancelled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
        border: isCancelled ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,106,0,0.12)',
        opacity: isCancelled ? 0.4 : 1,
      }}
    >
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
            <Clock size={12} />
            {booking.time}
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{dateLabel}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Scissors size={11} style={{ color: '#FF6A00', flexShrink: 0 }} />
        <span className="text-xs font-medium text-white">{booking.service?.name}</span>
        <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>{booking.service?.priceDisplay}</span>
      </div>

      {!isCancelled && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
          >
            <Check size={11} />
            OK
          </button>
          <button
            onClick={onToggleReschedule}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{ background: 'rgba(255,106,0,0.08)', border: '1px solid rgba(255,106,0,0.2)', color: '#FF6A00' }}
          >
            <RefreshCw size={11} />
            Reagendar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            <XCircle size={11} />
            Cancelar
          </button>
        </div>
      )}

      {isRescheduling && (
        <div className="grid grid-cols-5 gap-1.5 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              onClick={() => onReschedule(t)}
              className="py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={t === booking.time
                ? { background: 'rgba(255,106,0,0.2)', border: '1px solid rgba(255,106,0,0.5)', color: '#FF6A00' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
