import { format, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

export function formatDatePtBR(date) {
  return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}
export function formatDateShort(date) {
  return format(date, 'dd/MM/yyyy')
}

/* ── Mapeamento Supabase ↔ JS ── */
function toRow(b) {
  return { id: b.id, client_name: b.clientName, client_phone: b.clientPhone, service: typeof b.service === 'object' ? JSON.stringify(b.service) : b.service, date_str: b.dateStr, time: b.time, reminder: b.reminder, status: b.status || 'confirmed', created_at: b.createdAt }
}
function fromRow(r) {
  let service = r.service
  try { if (typeof r.service === 'string' && r.service.startsWith('{')) service = JSON.parse(r.service) } catch {}
  return { id: r.id, clientName: r.client_name, clientPhone: r.client_phone, service, dateStr: r.date_str, time: r.time, reminder: r.reminder, status: r.status, createdAt: r.created_at }
}

/* ── localStorage ── */
function lsGet()          { try { return JSON.parse(localStorage.getItem('r9_bookings') || '[]') } catch { return [] } }
function lsSet(arr)       { localStorage.setItem('r9_bookings', JSON.stringify(arr)) }
function lsGetBlocked()   { try { return JSON.parse(localStorage.getItem('r9_blocked')  || '[]') } catch { return [] } }
function lsSetBlocked(arr){ localStorage.setItem('r9_blocked',  JSON.stringify(arr)) }

/* ── Sync inicial ── */
export async function syncFromSupabase() {
  try {
    const [{ data: b }, { data: bl }] = await Promise.all([
      supabase.from('bookings').select('*'),
      supabase.from('blocked_slots').select('*'),
    ])
    if (b)  lsSet(b.map(fromRow))
    if (bl) lsSetBlocked(bl)
  } catch (e) { console.warn('Supabase sync failed:', e.message) }
}

/* ── Agendamentos ── */
export async function getBookedSlots() {
  try {
    const { data, error } = await supabase.from('bookings').select('*')
    if (error) throw error
    const list = data.map(fromRow)
    lsSet(list)
    return list
  } catch { return lsGet() }
}

export async function checkSlotTaken(dateStr, time) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('date_str', dateStr)
      .eq('time', time)
      .neq('status', 'cancelled')
      .limit(1)
    if (error) throw error
    return data.length > 0
  } catch {
    return lsGet().some(b => b.dateStr === dateStr && b.time === time && b.status !== 'cancelled')
  }
}

export async function saveBooking(booking) {
  const local = lsGet(); local.push(booking); lsSet(local)
  const { error } = await supabase.from('bookings').insert(toRow(booking))
  if (error) console.error('Supabase insert error:', error.message)

}

export async function cancelBooking(id) {
  lsSet(lsGet().filter(b => b.id !== id))
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) console.error('Supabase delete error:', error.message)
}

export async function updateBookingStatus(id, status) {
  lsSet(lsGet().map(b => b.id === id ? { ...b, status } : b))
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
  if (error) console.error('Supabase update error:', error.message)
}

export async function rescheduleBooking(id, newTime) {
  lsSet(lsGet().map(b => b.id === id ? { ...b, time: newTime } : b))
  const { error } = await supabase.from('bookings').update({ time: newTime }).eq('id', id)
  if (error) console.error('Supabase reschedule error:', error.message)
}

/* ── Bloqueios ── */
export async function getBlockedSlots() {
  try {
    const { data, error } = await supabase.from('blocked_slots').select('*')
    if (error) throw error
    lsSetBlocked(data)
    return data
  } catch { return lsGetBlocked() }
}

export async function blockSlot(dateStr, time = null) {
  const id = `${dateStr}-${time ?? 'day'}-${Date.now()}`
  const row = { id, date_str: dateStr, time: time ?? null, created_at: new Date().toISOString() }
  const local = lsGetBlocked()
  if (!local.some(b => b.date_str === dateStr && b.time === (time ?? null))) {
    lsSetBlocked([...local, row])
  }
  const { error } = await supabase.from('blocked_slots').upsert(row)
  if (error) console.error('Block slot error:', error.message)
}

export async function unblockSlot(id) {
  lsSetBlocked(lsGetBlocked().filter(b => b.id !== id))
  const { error } = await supabase.from('blocked_slots').delete().eq('id', id)
  if (error) console.error('Unblock error:', error.message)
}

export function isSlotBooked(date, time) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const blocked = lsGetBlocked()
  if (blocked.some(b => b.date_str === dateStr && b.time === null)) return true
  if (blocked.some(b => b.date_str === dateStr && b.time === time)) return true
  return lsGet().some(b => b.dateStr === dateStr && b.time === time)
}

export function isDayFullyBlocked(date) {
  const dateStr = format(date, 'yyyy-MM-dd')
  return lsGetBlocked().some(b => b.date_str === dateStr && b.time === null)
}

/* ── Google Calendar ── */
export function generateGoogleCalendarUrl(booking) {
  const { service, date, time, clientName } = booking
  const [h, m] = time.split(':').map(Number)
  const start = new Date(date); start.setHours(h, m, 0)
  const end = addMinutes(start, service.duration)
  const fmt = d => format(d, "yyyyMMdd'T'HHmmss")
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`R9 Barbearia – ${service.name}`)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`Agendamento: ${service.name}\nCliente: ${clientName}\nValor: ${service.priceDisplay}`)}&location=${encodeURIComponent('Rua Fernando de Noronha, 100, Bragança Paulista/SP')}&sf=true&output=xml`
}

/* ── Notificações ── */
export function scheduleNotification(booking, reminderMinutes) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const { service, date, time } = booking
  const [h, m] = time.split(':').map(Number)
  const appt = new Date(date); appt.setHours(h, m, 0)
  const delay = appt.getTime() - reminderMinutes * 60000 - Date.now()
  if (delay > 0) setTimeout(() => new Notification('R9 Barbearia 💈', { body: `${service.name} às ${time}`, icon: 'https://i.postimg.cc/zBrYSf50/R9-LOGO.png', tag: `r9-${booking.id}` }), delay)
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  return (await Notification.requestPermission()) === 'granted'
}
