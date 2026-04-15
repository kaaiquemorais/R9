import { format, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDatePtBR(date) {
  return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatDateShort(date) {
  return format(date, 'dd/MM/yyyy')
}

export function generateGoogleCalendarUrl(booking) {
  const { service, date, time, clientName } = booking
  const [hours, minutes] = time.split(':').map(Number)
  const startDate = new Date(date)
  startDate.setHours(hours, minutes, 0)
  const endDate = addMinutes(startDate, service.duration)

  const formatGCal = (d) => format(d, "yyyyMMdd'T'HHmmss")
  const start = formatGCal(startDate)
  const end = formatGCal(endDate)

  const title = encodeURIComponent(`R9 Barbearia – ${service.name}`)
  const details = encodeURIComponent(
    `Agendamento: ${service.name}\nCliente: ${clientName}\nValor: ${service.priceDisplay}\nDuração: ${service.durationDisplay}`
  )
  const location = encodeURIComponent('Rua Fernando de Noronha, 100, Bragança Paulista/SP')

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}&sf=true&output=xml`
}

export function scheduleNotification(booking, reminderMinutes) {
  if (!('Notification' in window)) return

  const { service, date, time } = booking
  const [hours, minutes] = time.split(':').map(Number)
  const appointmentDate = new Date(date)
  appointmentDate.setHours(hours, minutes, 0)

  const notifyAt = new Date(appointmentDate.getTime() - reminderMinutes * 60 * 1000)
  const delay = notifyAt.getTime() - Date.now()

  if (delay <= 0) return

  if (Notification.permission === 'granted') {
    setTimeout(() => {
      new Notification('R9 Barbearia 💈', {
        body: `Seu horário está chegando! ${service.name} às ${time}`,
        icon: 'https://i.postimg.cc/zBrYSf50/R9-LOGO.png',
        badge: 'https://i.postimg.cc/zBrYSf50/R9-LOGO.png',
        tag: `r9-reminder-${booking.id}`,
      })
    }, delay)
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getBookedSlots() {
  try {
    return JSON.parse(localStorage.getItem('r9_bookings') || '[]')
  } catch {
    return []
  }
}

export function saveBooking(booking) {
  const bookings = getBookedSlots()
  bookings.push(booking)
  localStorage.setItem('r9_bookings', JSON.stringify(bookings))
}

export function isSlotBooked(date, time) {
  const bookings = getBookedSlots()
  const dateStr = format(date, 'yyyy-MM-dd')
  return bookings.some((b) => b.dateStr === dateStr && b.time === time)
}

export function cancelBooking(bookingId) {
  const bookings = getBookedSlots()
  const updated = bookings.filter((b) => b.id !== bookingId)
  localStorage.setItem('r9_bookings', JSON.stringify(updated))
}

export function updateBookingStatus(bookingId, status) {
  const bookings = getBookedSlots()
  const updated = bookings.map((b) => (b.id === bookingId ? { ...b, status } : b))
  localStorage.setItem('r9_bookings', JSON.stringify(updated))
}
