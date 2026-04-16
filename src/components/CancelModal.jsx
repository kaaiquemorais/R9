import { useState } from 'react'
import { X, Phone, Calendar, AlertTriangle, Search } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { cancelBooking } from '../utils/calendar'
import toast from 'react-hot-toast'

function fromRow(r) {
  let service = r.service
  try { if (typeof r.service === 'string' && r.service.startsWith('{')) service = JSON.parse(r.service) } catch {}
  return { id: r.id, clientName: r.client_name, clientPhone: r.client_phone, service, dateStr: r.date_str, time: r.time, status: r.status }
}

function svcName(b) {
  return (typeof b.service === 'object' ? b.service?.name : b.service) || 'Serviço'
}

function canCancel(b) {
  try {
    const [h, m] = b.time.split(':').map(Number)
    const dt = new Date(`${b.dateStr}T00:00:00`)
    dt.setHours(h, m, 0, 0)
    return dt.getTime() - Date.now() >= 3 * 3600 * 1000
  } catch { return false }
}

function formatBookingDate(dateStr, time) {
  try {
    return `${format(parseISO(dateStr), "dd 'de' MMMM", { locale: ptBR })} às ${time}`
  } catch { return `${dateStr} às ${time}` }
}

export default function CancelModal({ isOpen, onClose }) {
  const [phone, setPhone]           = useState('')
  const [bookings, setBookings]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [cancellingId, setCancellingId] = useState(null)

  if (!isOpen) return null

  const handleSearch = async () => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 8) { toast.error('Informe um telefone válido'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .ilike('client_phone', `%${cleaned}%`)
        .neq('status', 'cancelled')
      if (error) throw error
      const now = Date.now()
      const list = data.map(fromRow).filter(b => {
        try {
          const [h, m] = b.time.split(':').map(Number)
          const dt = new Date(`${b.dateStr}T00:00:00`)
          dt.setHours(h, m, 0, 0)
          return dt.getTime() > now - 3600000 // inclui até 1h atrás pra mostrar contexto
        } catch { return true }
      })
      setBookings(list)
    } catch {
      const local = JSON.parse(localStorage.getItem('r9_bookings') || '[]')
      setBookings(
        local.filter(b =>
          b.clientPhone?.replace(/\D/g, '').includes(cleaned) &&
          b.status !== 'cancelled'
        )
      )
    }
    setLoading(false)
  }

  const handleCancel = async (b) => {
    setCancellingId(b.id)
    await cancelBooking(b.id)
    setBookings(prev => prev.filter(x => x.id !== b.id))
    toast.success('Agendamento cancelado!')
    setCancellingId(null)
  }

  const reset = () => { setPhone(''); setBookings(null) }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full sm:max-w-md bg-[#111] border border-white/8 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Handle bar mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Phone size={15} className="text-primary" />
            </div>
            <h2 className="text-base font-bold">Cancelar agendamento</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">

          {/* Phone input */}
          <div>
            <p className="text-sm text-text-muted mb-3">
              Informe o telefone usado no agendamento
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={e => { setPhone(e.target.value); setBookings(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-surface-2 border border-white/10 rounded-xl px-4 py-3 text-sm text-text placeholder-text-muted outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn-primary px-4 py-3 text-sm flex items-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search size={15} />
                )}
                Buscar
              </button>
            </div>
          </div>

          {/* Results */}
          {bookings !== null && (
            <div>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm space-y-2">
                  <Phone size={30} className="mx-auto opacity-25" />
                  <p>Nenhum agendamento ativo encontrado para este telefone.</p>
                  <button onClick={reset} className="text-primary text-xs underline underline-offset-2">
                    Tentar outro número
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wider">
                    {bookings.length} agendamento{bookings.length > 1 ? 's' : ''} encontrado{bookings.length > 1 ? 's' : ''}
                  </p>
                  {bookings.map(b => {
                    const ok = canCancel(b)
                    return (
                      <div
                        key={b.id}
                        className="bg-surface-2 border border-white/8 rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text">{svcName(b)}</p>
                            <p className="text-xs text-text-muted flex items-center gap-1.5">
                              <Calendar size={11} />
                              {formatBookingDate(b.dateStr, b.time)}
                            </p>
                            <p className="text-xs text-text-muted">
                              Cliente: {b.clientName}
                            </p>
                            {!ok && (
                              <p className="text-xs text-amber-400 flex items-center gap-1.5 pt-0.5">
                                <AlertTriangle size={11} />
                                Menos de 3h de antecedência — ligue: (11) 99666-5871
                              </p>
                            )}
                          </div>
                          {ok && (
                            <button
                              onClick={() => handleCancel(b)}
                              disabled={cancellingId === b.id}
                              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50"
                            >
                              {cancellingId === b.id
                                ? <span className="w-3 h-3 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin inline-block" />
                                : 'Cancelar'
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Policy note */}
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl px-4 py-3">
            <p className="text-xs text-amber-400/80 leading-relaxed">
              Pedimos que cancelamentos sejam feitos com pelo menos{' '}
              <strong className="text-amber-400">3 horas de antecedência</strong>.
              Para cancelamentos de última hora, entre em contato pelo{' '}
              <a href="tel:11996665871" className="underline underline-offset-2">(11) 99666-5871</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
