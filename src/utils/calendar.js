import { format, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

/* ── Formatação ── */
export function formatDatePtBR(date) {
  return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}
export function formatDateShort(date) {
  return format(date, 'dd/MM/yyyy')
}

/* ── Mapeamento Supabase ↔ JS ── */
function toRow(b) {
  return {
    id:           b.id,
    client_name:  b.clientName,
    client_phone: b.clientPhone,
    service:      b.service,
    date_str:     b.dateStr,
    time:         b.time,
    reminder:     b.reminder,
    status:       b.status || 'confirmed',
    created_at:   b.createdAt,
  }
}

function fromRow(r) {
  return {
    id:          r.id,
    clientName:  r.client_name,
    clientPhone: r.client_phone,
    service:     r.service,
    dateStr:     r.date_str,
    time:        r.time,
    reminder:    r.reminder,
    status:      r.status,
    createdAt:   r.created_at,
  }
}

/* ── localStorage helpers ── */
function lsGet() { try { return JSON.parse(localStorage.getItem('r9_bookings') || '[]') } catch { return [] } }
function lsSet(arr) { localStorage.setItem('r9_bookings', JSON.stringify(arr)) }

/* ── Sincroniza Supabase → localStorage na inicialização ── */
export async function syncFromSupabase() {
  try {
    const { data, error } = await supabase.from('bookings').select('*')
    if (error) throw error
    lsSet(data.map(fromRow))
  } catch (e) {
    console.warn('Supabase sync failed, using localStorage:', e.message)
  }
}

/* ── Busca todos os agendamentos ── */
export async function getBookedSlots() {
  try {
    const { data, error } = await supabase.from('bookings').select('*')
    if (error) throw error
    const bookings = data.map(fromRow)
    lsSet(bookings)
    return bookings
  } catch {
    return lsGet()
  }
}

/* ── Salva agendamento ── */
export async function saveBooking(booking) {
  // localStorage imediato para UI instantânea
  const local = lsGet()
  local.push(booking)
  lsSet(local)
  // Persiste no Supabase
  const { error } = await supabase.from('bookings').insert(toRow(booking))
  if (error) console.error('Supabase insert error:', error.message)
}

/* ── Verifica slot ocupado (síncrono via localStorage) ── */
export function isSlotBooked(date, time) {
  const dateStr = format(date, 'yyyy-MM-dd')
  return lsGet().some(b => b.dateStr === dateStr && b.time === time)
}

/* ── Cancela agendamento ── */
export async function cancelBooking(bookingId) {
  lsSet(lsGet().filter(b => b.id !== bookingId))
  const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
  if (error) console.error('Supabase delete error:', error.message)
}

/* ── Atualiza status ── */
export async function updateBookingStatus(bookingId, status) {
  lsSet(lsGet().map(b => b.id === bookingId ? { ...b, status } : b))
  const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId)
  if (error) console.error('Supabase update error:', error.message)
}

/* ── Reagenda horário ── */
export async function rescheduleBooking(bookingId, newTime) {
  lsSet(lsGet().map(b => b.id === bookingId ? { ...b, time: newTime } : b))
  const { error } = await supabase.from('bookings').update({ time: newTime }).eq('id', bookingId)
  if (error) console.error('Supabase reschedule error:', error.message)
}

/* ── Google Calendar ── */
export function generateGoogleCalendarUrl(booking) {
  const { service, date, time, clientName } = booking
  const [hours, minutes] = time.split(':').map(Number)
  const startDate = new Date(date)
  startDate.setHours(hours, minutes, 0)
  const endDate = addMinutes(startDate, service.duration)
  const fmt = d => format(d, "yyyyMMdd'T'HHmmss")
  const title    = encodeURIComponent(`R9 Barbearia – ${service.name}`)
  const details  = encodeURIComponent(`Agendamento: ${service.name}\nCliente: ${clientName}\nValor: ${service.priceDisplay}\nDuração: ${service.durationDisplay}`)
  const location = encodeURIComponent('Rua Fernando de Noronha, 100, Bragança Paulista/SP')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${details}&location=${location}&sf=true&output=xml`
}

/* ── Notificações ── */
export function scheduleNotification(booking, reminderMinutes) {
  if (!('Notification' in window)) return
  const { service, date, time } = booking
  const [hours, minutes] = time.split(':').map(Number)
  const appointmentDate = new Date(date)
  appointmentDate.setHours(hours, minutes, 0)
  const delay = new Date(appointmentDate.getTime() - reminderMinutes * 60 * 1000).getTime() - Date.now()
  if (delay <= 0) return
  if (Notification.permission === 'granted') {
    setTimeout(() => {
      new Notification('R9 Barbearia 💈', {
        body: `Seu horário está chegando! ${service.name} às ${time}`,
        icon: 'https://i.postimg.cc/zBrYSf50/R9-LOGO.png',
        tag: `r9-reminder-${booking.id}`,
      })
    }, delay)
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  return (await Notification.requestPermission()) === 'granted'
}
