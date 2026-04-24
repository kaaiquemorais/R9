import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Calendar, Clock, User, Phone, Bell, AlertTriangle, Mail } from 'lucide-react'
import { format, startOfDay, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SERVICES, TIME_SLOTS } from '../data/services'
import {
  formatDatePtBR,
  saveBooking,
  checkSlotTaken,
  checkPhoneBlocked,
  checkPhoneHasActiveBooking,
  checkPhoneScore,
  isSlotBooked,
  isDayFullyBlocked,
} from '../utils/calendar'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const LOGO = 'https://i.postimg.cc/Vs2HNR1x/logo-r9-certo.png'

const REMINDER_OPTS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: '2 horas', minutes: 120 },
  { label: '1 dia',  minutes: 1440 },
]

function buildCombined(services) {
  if (!services.length) return null
  const hasConsultar = services.some(s => s.price === null)
  const totalPrice = hasConsultar ? null : services.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0)
  return {
    name: services.map(s => s.name).join(' + '),
    price: totalPrice,
    priceDisplay: hasConsultar ? 'R$ Consultar' : `R$ ${totalPrice.toFixed(2).replace('.', ',')}`,
    duration: totalDuration,
    durationDisplay: `${totalDuration} min`,
  }
}

function buildGoogleCalUrl(booking, reminderMinutes) {
  try {
    const [h, m] = booking.time.split(':').map(Number)
    const start = new Date(`${booking.dateStr}T00:00:00`)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + (booking.service?.duration || 60) * 60000)
    const fmt = d => d.toISOString().replace(/[-:]/g, '').slice(0, 15)
    const text = encodeURIComponent(`R9 Barbearia – ${booking.service?.name}`)
    const details = encodeURIComponent(`Serviço: ${booking.service?.name}\nValor: ${booking.service?.priceDisplay}\nRua Fernando de Noronha, 100 – Bragança Paulista/SP`)
    const location = encodeURIComponent('Rua Fernando de Noronha, 100, Bragança Paulista/SP')
    let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}&sf=true&output=xml`
    if (reminderMinutes) url += `&crm=POPUP&crmtime=${reminderMinutes}`
    return url
  } catch { return null }
}

export default function BookingModal({ isOpen, onClose, preselectedService }) {
  const { user, profile } = useAuth()
  const [step, setStep]                     = useState(1)
  const [selectedServices, setSelectedServices] = useState(preselectedService ? [preselectedService] : [])
  const [selectedDate, setSelectedDate]     = useState(null)
  const [selectedTime, setSelectedTime]     = useState(null)
  const [clientName, setClientName]         = useState('')
  const [clientSurname, setClientSurname]   = useState('')
  const [clientPhone, setClientPhone]       = useState('')
  const [calendarMonth, setCalendarMonth]   = useState(new Date())
  const [confirmed, setConfirmed]           = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  // reminder state (post-confirm)
  const [wantsReminder, setWantsReminder]   = useState(null) // null | true | false
  const [reminderMinutes, setReminderMinutes] = useState(null)

  const combinedService = buildCombined(selectedServices)

  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.some(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    )
  }

  useEffect(() => {
    if (preselectedService) {
      setSelectedServices([preselectedService])
      setStep(2)
    }
  }, [preselectedService, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(preselectedService ? 2 : 1)
        setSelectedServices(preselectedService ? [preselectedService] : [])
        setSelectedDate(null)
        setSelectedTime(null)
        setClientName('')
        setClientSurname('')
        setClientPhone('')
        setConfirmed(false)
        setConfirmedBooking(null)
        setWantsReminder(null)
        setReminderMinutes(null)
      }, 300)
    }
  }, [isOpen, preselectedService])

  if (!isOpen) return null

  if (!user) {
    return (
      <ModalWrapper onClose={onClose}>
        <AuthGate />
      </ModalWrapper>
    )
  }

  const today = startOfDay(new Date())

  const daysInView = (() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    const startPad = (firstDay.getDay() + 6) % 7
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    return days
  })()

  const isDateAvailable = (date) => {
    if (!date) return false
    if (isBefore(startOfDay(date), today)) return false
    if (date.getDay() === 0) return false
    if (isDayFullyBlocked(date)) return false
    return true
  }

  const availableSlots = TIME_SLOTS.filter(t => {
    if (!selectedDate) return true
    return !isSlotBooked(selectedDate, t)
  })

  const handleConfirm = async () => {
    if (!clientName.trim() || !clientSurname.trim() || !clientPhone.trim()) {
      toast.error('Preencha nome, sobrenome e telefone')
      return
    }
    const fullName = `${clientName.trim()} ${clientSurname.trim()}`

    // A — Lista negra
    const blocked = await checkPhoneBlocked(clientPhone.trim())
    if (blocked) {
      toast.error('Este número não pode realizar agendamentos. Entre em contato com a barbearia.')
      return
    }

    // Reputação — score baixo bloqueia
    const score = await checkPhoneScore(clientPhone.trim())
    if (score < 40) {
      toast.error('Não é possível agendar com este número. Entre em contato com a barbearia.')
      return
    }

    const hasActive = await checkPhoneHasActiveBooking(clientPhone.trim())
    if (hasActive) {
      toast.error('Este número já atingiu o limite de agendamentos ativos. Cancele um anterior para agendar novamente.')
      return
    }

    // Verificação em tempo real de horário
    const taken = await checkSlotTaken(format(selectedDate, 'yyyy-MM-dd'), selectedTime)
    if (taken) {
      toast.error('Este horário acabou de ser reservado. Escolha outro horário.')
      setStep(3)
      return
    }

    // C — salva como pending (aguardando aprovação do barbeiro)
    const booking = {
      id: Date.now().toString(),
      service: combinedService,
      date: selectedDate,
      dateStr: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
      clientName: fullName,
      clientPhone: clientPhone.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: profile?.id || null,
    }

    await saveBooking(booking)
    setConfirmedBooking(booking)
    setConfirmed(true)
  }

  const canProceed = () => {
    if (step === 1) return selectedServices.length > 0
    if (step === 2) return !!selectedDate
    if (step === 3) return !!selectedTime
    return true
  }

  // ── Tela de confirmação (pending) ──
  if (confirmed && confirmedBooking) {
    return (
      <ModalWrapper onClose={onClose}>
        <div className="flex flex-col items-center text-center py-6 px-2 gap-5">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
            <Clock size={28} className="text-amber-400" />
          </div>

          <div>
            <h3 className="text-xl font-black mb-1">Solicitação enviada!</h3>
            <p className="text-text-muted text-sm">Aguardando confirmação do barbeiro, <span className="text-text font-semibold">{clientName}</span></p>
          </div>

          <div className="w-full bg-surface-2 rounded-2xl p-4 text-left space-y-2.5">
            <BookingDetail icon={<Calendar size={14} />} label="Data"    value={formatDatePtBR(selectedDate)} />
            <BookingDetail icon={<Clock size={14} />}    label="Horário" value={selectedTime} />
            <BookingDetail icon={<User size={14} />}     label="Serviço" value={combinedService?.name} />
          </div>

          {/* Lembrete no Google Agenda (após confirmação do barbeiro) */}
          {wantsReminder === null && (
            <div className="w-full space-y-3">
              <p className="text-sm font-semibold flex items-center justify-center gap-2">
                <Bell size={15} className="text-primary" />
                Quer um lembrete no Google Agenda?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setWantsReminder(true)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 transition-all">Sim!</button>
                <button onClick={() => setWantsReminder(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-surface-2 border border-white/8 text-text-muted hover:text-text transition-all">Não</button>
              </div>
            </div>
          )}

          {wantsReminder === true && (
            <div className="w-full space-y-3">
              <p className="text-sm font-semibold text-center">Avisar quanto tempo antes?</p>
              <div className="grid grid-cols-5 gap-2">
                {REMINDER_OPTS.map(opt => (
                  <button key={opt.minutes} onClick={() => setReminderMinutes(opt.minutes)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${reminderMinutes === opt.minutes ? 'bg-primary/20 border border-primary/50 text-primary' : 'bg-surface-2 border border-white/8 text-text-muted hover:text-text'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {reminderMinutes && (
                <a href={buildGoogleCalUrl(confirmedBooking, reminderMinutes)} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-light text-white py-3 rounded-xl font-semibold text-sm hover:shadow-[0_0_20px_rgba(255,106,0,0.4)] transition-all">
                  <Calendar size={15} /> Adicionar ao Google Agenda
                </a>
              )}
            </div>
          )}

          {wantsReminder === false && <button onClick={onClose} className="btn-primary w-full">Fechar</button>}
          {wantsReminder === true && reminderMinutes && <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm text-text-muted hover:text-text transition-colors">Fechar</button>}
          {wantsReminder === true && !reminderMinutes && <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm text-text-muted hover:text-text transition-colors">Pular</button>}

          {/* Aviso de cancelamento */}
          <div className="w-full bg-white/3 border border-white/8 rounded-2xl px-4 py-3 text-left">
            <p className="text-xs text-text-muted leading-relaxed">
              Precisa cancelar? Acesse o site e clique em{' '}
              <span className="text-text font-semibold">"Informar cancelamento"</span>,
              informe seu telefone e cancele seu horário.
              Pedimos pelo menos <span className="text-amber-400 font-semibold">3 horas de antecedência</span>.
            </p>
          </div>
        </div>
      </ModalWrapper>
    )
  }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="min-h-[320px]">
        {step === 1 && (
          <StepService services={SERVICES} selected={selectedServices} onToggle={toggleService} combined={combinedService} />
        )}
        {step === 2 && (
          <StepDate
            days={daysInView} selected={selectedDate} onSelect={setSelectedDate}
            isAvailable={isDateAvailable} calendarMonth={calendarMonth}
            onPrevMonth={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
            onNextMonth={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
            today={today}
          />
        )}
        {step === 3 && (
          <StepTime slots={availableSlots} allSlots={TIME_SLOTS} selected={selectedTime} onSelect={setSelectedTime} selectedDate={selectedDate} />
        )}
        {step === 4 && (
          <StepConfirm
            service={combinedService} date={selectedDate} time={selectedTime}
            clientName={clientName} clientSurname={clientSurname} clientPhone={clientPhone}
            onNameChange={setClientName} onSurnameChange={setClientSurname} onPhoneChange={setClientPhone}
          />
        )}
      </div>

      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-2 text-text-muted hover:text-text hover:bg-surface-3 transition-all duration-200 font-medium text-sm"
          >
            <ChevronLeft size={16} />
            Voltar
          </button>
        )}
        <button
          onClick={() => step < 4 ? setStep(s => s + 1) : handleConfirm()}
          disabled={!canProceed()}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300
            ${canProceed()
              ? 'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-[0_0_30px_rgba(255,106,0,0.4)] hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-surface-2 text-text-muted cursor-not-allowed'
            }`}
        >
          {step < 4 ? (<>Continuar <ChevronRight size={16} /></>) : (<><Check size={16} /> Confirmar Agendamento</>)}
        </button>
      </div>
    </ModalWrapper>
  )
}

function ModalWrapper({ onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full sm:max-w-lg bg-surface border border-white/8 sm:rounded-3xl rounded-t-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-slide-up max-h-[95vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <img src={LOGO} alt="R9 Barbearia" className="h-10 w-auto object-contain" />
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-text-muted hover:text-text transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function StepService({ services, selected, onToggle, combined }) {
  return (
    <div>
      <h3 className="text-base font-bold mb-1">Qual serviço?</h3>
      <p className="text-text-muted text-xs mb-4">Selecione um ou mais serviços</p>
      <div className="grid grid-cols-1 gap-2.5">
        {services.map(s => {
          const isSelected = selected.some(sel => sel.id === s.id)
          return (
            <button
              key={s.id}
              onClick={() => onToggle(s)}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left w-full
                ${isSelected
                  ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(255,106,0,0.15)]'
                  : 'border-white/8 bg-surface-2 hover:border-white/20 hover:bg-surface-3'
                }`}
            >
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={LOGO} alt="R9" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-text-muted text-xs">{s.durationDisplay}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`font-bold text-sm ${s.price ? 'text-primary' : 'text-text-muted'}`}>{s.priceDisplay}</div>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                ${isSelected ? 'bg-primary border-primary' : 'border-white/20'}`}>
                {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>
      {combined && (
        <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
          <div className="text-xs text-text-muted">
            <span className="text-text font-semibold">{selected.length} serviço{selected.length > 1 ? 's' : ''}</span>
            {' · '}{combined.durationDisplay}
          </div>
          <div className="text-sm font-bold text-primary">{combined.priceDisplay}</div>
        </div>
      )}
    </div>
  )
}

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function StepDate({ days, selected, onSelect, isAvailable, calendarMonth, onPrevMonth, onNextMonth, today }) {
  const monthName = format(calendarMonth, "MMMM 'de' yyyy", { locale: ptBR })
  const isPrevDisabled = calendarMonth.getMonth() === today.getMonth() && calendarMonth.getFullYear() === today.getFullYear()

  return (
    <div>
      <h3 className="text-base font-bold mb-4">Qual data?</h3>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrevMonth} disabled={isPrevDisabled} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center disabled:opacity-30 hover:bg-surface-3 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize">{monthName}</span>
        <button onClick={onNextMonth} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map(d => <div key={d} className="text-center text-text-muted text-xs font-medium py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />
          const available = isAvailable(date)
          const isSelected = selected && format(date, 'yyyy-MM-dd') === format(selected, 'yyyy-MM-dd')
          const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
          return (
            <button
              key={date.toISOString()}
              onClick={() => available && onSelect(date)}
              disabled={!available}
              className={`aspect-square rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center
                ${isSelected
                  ? 'bg-gradient-to-br from-primary to-primary-light text-white shadow-[0_0_15px_rgba(255,106,0,0.4)] scale-105'
                  : available
                    ? `bg-surface-2 hover:bg-surface-3 border border-transparent text-text ${isToday ? 'border-primary/40 text-primary' : ''}`
                    : 'bg-surface/50 text-text-muted/30 cursor-not-allowed'
                }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
      {selected && (
        <p className="text-center text-primary text-xs font-medium mt-4 capitalize">{formatDatePtBR(selected)}</p>
      )}
    </div>
  )
}

function StepTime({ slots, allSlots, selected, onSelect, selectedDate }) {
  return (
    <div>
      <h3 className="text-base font-bold mb-1">Qual horário?</h3>
      {selectedDate && <p className="text-text-muted text-xs mb-4 capitalize">{formatDatePtBR(selectedDate)}</p>}
      <div className="grid grid-cols-4 gap-2">
        {allSlots.map(time => {
          const available = slots.includes(time)
          const isSelected = selected === time
          return (
            <button
              key={time}
              onClick={() => available && onSelect(time)}
              disabled={!available}
              className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200
                ${isSelected
                  ? 'bg-gradient-to-br from-primary to-primary-light text-white shadow-[0_0_15px_rgba(255,106,0,0.4)]'
                  : available
                    ? 'bg-surface-2 text-text hover:bg-surface-3 border border-transparent'
                    : 'bg-surface/30 text-text-muted/30 cursor-not-allowed line-through'
                }`}
            >
              {time}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepConfirm({ service, date, time, clientName, clientSurname, clientPhone, onNameChange, onSurnameChange, onPhoneChange }) {
  const formatPhone = val => {
    const nums = val.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return nums
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`
    return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`
  }

  return (
    <div className="space-y-5">
      <div className="bg-surface-2 rounded-2xl p-4 space-y-2.5">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Resumo</h4>
        <BookingDetail icon={<User size={14} />}     label="Serviço"  value={service?.name} />
        <BookingDetail icon={<Calendar size={14} />} label="Data"     value={date ? formatDatePtBR(date) : ''} />
        <BookingDetail icon={<Clock size={14} />}    label="Horário"  value={time} />
        <BookingDetail icon={<span className="text-xs font-bold text-primary">R$</span>} label="Valor" value={service?.priceDisplay} />
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Seus dados</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Nome" value={clientName} onChange={e => onNameChange(e.target.value)} className="input-field pl-10" />
          </div>
          <input type="text" placeholder="Sobrenome" value={clientSurname} onChange={e => onSurnameChange(e.target.value)} className="input-field" />
        </div>
        <div className="relative">
          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="tel" placeholder="(11) 99999-9999" value={clientPhone} onChange={e => onPhoneChange(formatPhone(e.target.value))} className="input-field pl-10" />
        </div>
      </div>
    </div>
  )
}

function BookingDetail({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-text-muted text-xs">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <span className="text-text text-xs font-semibold text-right capitalize">{value}</span>
    </div>
  )
}

function AuthGate() {
  const { sendOtp, verifyOtp } = useAuth()
  const [phase, setPhase]     = useState('email')
  const [email, setEmail]     = useState('')
  const [code, setCode]       = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleSend = async () => {
    if (!validEmail) {
      toast.error('Informe um e-mail válido')
      return
    }
    setSending(true)
    const { error } = await sendOtp(email)
    setSending(false)
    if (error) {
      toast.error(error.message || 'Erro ao enviar código')
      return
    }
    toast.success('Código enviado para seu e-mail')
    setPhase('code')
  }

  const handleVerify = async () => {
    if (code.trim().length < 6) {
      toast.error('Informe o código de 6 dígitos')
      return
    }
    setVerifying(true)
    const { error } = await verifyOtp(email, code)
    setVerifying(false)
    if (error) {
      toast.error('Código inválido ou expirado')
      return
    }
    toast.success('Login confirmado!')
  }

  return (
    <div className="flex flex-col items-center text-center py-4 px-2 gap-5">
      <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
        <Mail size={26} className="text-primary" />
      </div>

      <div>
        <h3 className="text-xl font-black mb-1">Faça login para agendar</h3>
        <p className="text-text-muted text-sm">
          {phase === 'email'
            ? 'Informe seu e-mail e enviaremos um código de acesso.'
            : `Enviamos um código para ${email}. Confira sua caixa de entrada.`}
        </p>
      </div>

      {phase === 'email' && (
        <div className="w-full space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="email"
              autoFocus
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!validEmail || sending}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300
              ${validEmail && !sending
                ? 'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-[0_0_30px_rgba(255,106,0,0.4)]'
                : 'bg-surface-2 text-text-muted cursor-not-allowed'
              }`}
          >
            {sending ? 'Enviando...' : 'Enviar código'}
          </button>
        </div>
      )}

      {phase === 'code' && (
        <div className="w-full space-y-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            maxLength={6}
            placeholder="Código de 6 dígitos"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            className="input-field text-center text-lg tracking-[0.4em] font-bold"
          />
          <button
            onClick={handleVerify}
            disabled={code.length < 6 || verifying}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300
              ${code.length >= 6 && !verifying
                ? 'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-[0_0_30px_rgba(255,106,0,0.4)]'
                : 'bg-surface-2 text-text-muted cursor-not-allowed'
              }`}
          >
            {verifying ? 'Verificando...' : 'Confirmar'}
          </button>
          <button
            onClick={() => { setCode(''); setPhase('email') }}
            className="w-full py-2 text-xs text-text-muted hover:text-text transition-colors"
          >
            Usar outro e-mail
          </button>
        </div>
      )}
    </div>
  )
}
