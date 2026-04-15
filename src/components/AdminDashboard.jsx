import { useState } from 'react'
import { X, Check, XCircle, RefreshCw, Calendar, User, Clock, Scissors, ChevronDown, BarChart2 } from 'lucide-react'
import { format, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getBookedSlots, cancelBooking, updateBookingStatus } from '../utils/calendar'
import { TIME_SLOTS } from '../data/services'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = 'fut09spa'

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

  const bookedToday = filteredBookings.filter(b => filter === 'today').map(b => b.time)
  const availableToday = TIME_SLOTS.filter(t => !bookedToday.includes(t))

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-surface border border-white/8 sm:rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col max-h-screen sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart2 size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-black text-lg">Painel Admin</h2>
              <p className="text-text-muted text-xs">R9 Barbearia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-3 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {!authenticated ? (
          <div className="p-8 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Scissors size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Acesso Restrito</h3>
              <p className="text-text-muted text-sm">Digite a senha para continuar</p>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className={`input-field text-center transition-all duration-200 ${pwError ? 'border-red-500/60 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''}`}
              />
              {pwError && <p className="text-red-400 text-xs text-center">Senha incorreta</p>}
              <button onClick={handleLogin} className="btn-primary w-full">
                Entrar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 p-5 border-b border-white/8 flex-shrink-0">
              <StatCard label="Hoje" value={todayCount} color="text-primary" />
              <StatCard label="Total" value={bookings.length} color="text-text" />
              <StatCard label="Disponíveis" value={availableToday.length} color="text-green-400" />
            </div>

            {/* Filter + Refresh */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
              <div className="flex gap-2">
                {['today', 'all', 'pending'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      filter === f ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted hover:text-text'
                    }`}
                  >
                    {f === 'today' ? 'Hoje' : f === 'all' ? 'Todos' : 'Ativos'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-text-muted hover:text-primary text-xs font-medium transition-colors"
              >
                <RefreshCw size={13} />
                Atualizar
              </button>
            </div>

            {/* Bookings List */}
            <div className="overflow-y-auto flex-1 no-scrollbar p-4 space-y-3">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar size={32} className="text-text-muted/30 mx-auto mb-3" />
                  <p className="text-text-muted text-sm">Nenhum agendamento encontrado</p>
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
              <div className="border-t border-white/8 p-4 flex-shrink-0">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                  Horários Livres Hoje
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableToday.map((t) => (
                    <span key={t} className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-lg font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-surface-2 rounded-xl p-3 text-center">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-text-muted text-xs mt-0.5">{label}</div>
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
    <div className={`bg-surface-2 rounded-2xl p-4 space-y-3 border transition-all duration-200
      ${isCancelled ? 'border-white/5 opacity-50' : 'border-white/8 hover:border-white/15'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-text-muted" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{booking.clientName}</p>
            <p className="text-text-muted text-xs">{booking.clientPhone}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 text-primary font-bold text-sm">
            <Clock size={13} />
            {booking.time}
          </div>
          <div className="text-text-muted text-xs">{dateLabel}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <Scissors size={12} className="text-primary flex-shrink-0" />
        <span className="text-sm font-medium">{booking.service?.name}</span>
        <span className="text-text-muted text-xs ml-auto">{booking.service?.priceDisplay}</span>
      </div>

      {!isCancelled && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-all"
          >
            <Check size={12} />
            Confirmar
          </button>
          <button
            onClick={onToggleReschedule}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
          >
            <RefreshCw size={12} />
            Reagendar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
          >
            <XCircle size={12} />
            Cancelar
          </button>
        </div>
      )}

      {isRescheduling && (
        <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-white/8">
          <p className="col-span-5 text-xs text-text-muted mb-1">Selecionar novo horário:</p>
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              onClick={() => onReschedule(t)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all
                ${t === booking.time ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-3 text-text-muted hover:text-text hover:bg-surface hover:border hover:border-white/20'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
