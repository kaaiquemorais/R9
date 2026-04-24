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
  return { id: b.id, client_name: b.clientName, client_phone: b.clientPhone, service: typeof b.service === 'object' ? JSON.stringify(b.service) : b.service, date_str: b.dateStr, time: b.time, reminder: b.reminder, status: b.status || 'pending', created_at: b.createdAt, user_id: b.userId || null }
}
function fromRow(r) {
  let service = r.service
  try { if (typeof r.service === 'string' && r.service.startsWith('{')) service = JSON.parse(r.service) } catch {}
  return { id: r.id, clientName: r.client_name, clientPhone: r.client_phone, service, dateStr: r.date_str, time: r.time, reminder: r.reminder, status: r.status, createdAt: r.created_at, userId: r.user_id }
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

/* ── Lista Negra (telefones) ── */
function lsGetBlockedPhones()    { try { return JSON.parse(localStorage.getItem('r9_blocked_phones') || '[]') } catch { return [] } }
function lsSetBlockedPhones(arr) { localStorage.setItem('r9_blocked_phones', JSON.stringify(arr)) }

export async function getBlockedPhones() {
  try {
    const { data, error } = await supabase.from('blocked_phones').select('*')
    if (error) throw error
    lsSetBlockedPhones(data)
    return data
  } catch { return lsGetBlockedPhones() }
}

export async function blockPhone(phone, reason = '') {
  const cleaned = phone.replace(/\D/g, '')
  const row = { id: `phone-${cleaned}-${Date.now()}`, phone: cleaned, reason, created_at: new Date().toISOString() }
  lsSetBlockedPhones([...lsGetBlockedPhones(), row])
  const { error } = await supabase.from('blocked_phones').insert(row)
  if (error) console.error('Block phone error:', error.message)
}

export async function unblockPhone(id) {
  lsSetBlockedPhones(lsGetBlockedPhones().filter(p => p.id !== id))
  const { error } = await supabase.from('blocked_phones').delete().eq('id', id)
  if (error) console.error('Unblock phone error:', error.message)
}

export async function checkPhoneBlocked(phone) {
  const cleaned = phone.replace(/\D/g, '')
  try {
    const { data, error } = await supabase.from('blocked_phones').select('id').eq('phone', cleaned).limit(1)
    if (error) throw error
    return data.length > 0
  } catch {
    return lsGetBlockedPhones().some(p => p.phone === cleaned)
  }
}

const MAX_ACTIVE_BOOKINGS = 1 // máximo de agendamentos ativos por telefone

export async function checkPhoneHasActiveBooking(phone) {
  const cleaned = phone.replace(/\D/g, '')
  try {
    const { data, error } = await supabase
      .from('bookings').select('id')
      .ilike('client_phone', `%${cleaned}%`)
      .in('status', ['pending', 'confirmed'])
    if (error) throw error
    return data.length >= MAX_ACTIVE_BOOKINGS
  } catch {
    const count = lsGet().filter(b =>
      b.clientPhone?.replace(/\D/g, '') === cleaned &&
      ['pending', 'confirmed'].includes(b.status)
    ).length
    return count >= MAX_ACTIVE_BOOKINGS
  }
}

/* ── Reputação de clientes ── */
const SCORE_DEFAULT   = 100
const SCORE_NO_SHOW   = -30   // pontos perdidos por falta sem aviso
const SCORE_BLOCKED   = 40    // score abaixo disso bloqueia novos agendamentos

export async function getClientScores() {
  try {
    const { data, error } = await supabase.from('client_scores').select('*')
    if (error) throw error
    return data || []
  } catch { return [] }
}

export async function getClientScore(phone) {
  const cleaned = phone.replace(/\D/g, '')
  try {
    const { data } = await supabase.from('client_scores').select('score,no_shows').eq('phone', cleaned).single()
    return data || { score: SCORE_DEFAULT, no_shows: 0 }
  } catch { return { score: SCORE_DEFAULT, no_shows: 0 } }
}

export async function checkUserHasActiveBooking(userId) {
  if (!userId) return false
  try {
    const { data, error } = await supabase
      .from('bookings').select('id')
      .eq('user_id', userId)
      .in('status', ['pending', 'confirmed'])
      .limit(1)
    if (error) throw error
    return data.length > 0
  } catch { return false }
}

export async function checkPhoneScore(phone) {
  const { score } = await getClientScore(phone)
  return score
}

export async function recordNoShow(phone) {
  const cleaned = phone.replace(/\D/g, '')
  const current = await getClientScore(cleaned)
  const newScore    = Math.max(0, current.score + SCORE_NO_SHOW)
  const newNoShows  = (current.no_shows || 0) + 1
  const { error } = await supabase.from('client_scores').upsert({
    phone: cleaned, score: newScore, no_shows: newNoShows,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('Record no-show error:', error.message)
  return newScore
}

export async function resetClientScore(phone) {
  const cleaned = phone.replace(/\D/g, '')
  const { error } = await supabase.from('client_scores').upsert({
    phone: cleaned, score: SCORE_DEFAULT, no_shows: 0,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('Reset score error:', error.message)
}

export { SCORE_DEFAULT, SCORE_NO_SHOW, SCORE_BLOCKED }

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
