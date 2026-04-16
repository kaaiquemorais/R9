import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Calendar, Clock, User, Phone, Bell, Scissors } from 'lucide-react'

import { format, addDays, startOfDay, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SERVICES, TIME_SLOTS, REMINDER_OPTIONS } from '../data/services'
import {
  formatDatePtBR,
  scheduleNotification,
  requestNotificationPermission,
  saveBooking,
  isSlotBooked,
  isDayFullyBlocked,
} from '../utils/calendar'
import toast from 'react-hot-toast'

const LOGO = 'https://i.postimg.cc/Vs2HNR1x/logo-r9-certo.png'

const STEPS = [
  { id: 1, label: 'Serviço' },
  { id: 2, label: 'Data' },
  { id: 3, label: 'Hora' },
  { id: 4, label: 'Confirmar' },
]

function buildCombined(services) {
  if (!services.length) return null
  const hasConsultar = services.some(s => s.price === null)
  const totalPrice = hasConsultar ? null : services.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0)
  return {
    name: services.map(s => s.name).join(' + '),
    price: totalPrice,
    priceDisplay: hasConsultar
      ? 'R$ Consultar'
      : `R$ ${totalPrice.toFixed(2).replace('.', ',')}`,
    duration: totalDuration,
    durationDisplay: `${totalDuration} min`,
  }
}

export default function BookingModal({ isOpen, onClose, preselectedService }) {
  const [step, setStep] = useState(1)
  const [selectedServices, setSelectedServices] = useState(preselectedService ? [preselectedService] : [])
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [reminder, setReminder] = useState('1h')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [confirmed, setConfirmed] = useState(false)

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
        setReminder('1h')
        setClientName('')
        setClientPhone('')
        setConfirmed(false)
        setGoogleCalUrl('')
      }, 300)
    }
  }, [isOpen, preselectedService])

  if (!isOpen) return null

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

  const availableSlots = TIME_SLOTS.filter((t) => {
    if (!selectedDate) return true
    return !isSlotBooked(selectedDate, t)
  })

  const handleConfirm = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error('Preencha seu nome e telefone')
      return
    }

    const booking = {
      id: Date.now().toString(),
      service: combinedService,
      date: selectedDate,
      dateStr: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      reminder,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }

    await saveBooking(booking)

    const reminderOption = REMINDER_OPTIONS.find((r) => r.id === reminder)
    const hasPermission = await requestNotificationPermission()
    if (hasPermission && reminderOption) {
      scheduleNotification(booking, reminderOption.minutes)
    }

    setConfirmed(true)
    toast.success('Agendamento confirmado!')
  }

  const canProceed = () => {
    if (step === 1) return selectedServices.length > 0
    if (step === 2) return !!selectedDate
    if (step === 3) return !!selectedTime
    return true
  }

  if (confirmed) {
    return (
      <ModalWrapper onClose={onClose}>
        <div className="flex flex-col items-center text-center py-8 px-4 gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-[0_0_40px_rgba(255,106,0,0.4)] animate-pulse-glow">
            <Check size={36} className="text-white" strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-2xl font-black mb-2">Agendamento Confirmado!</h3>
            <p className="text-text-muted text-sm">
              Até logo, <span className="text-text font-semibold">{clientName}</span>
            </p>
          </div>

          <div className="w-full bg-surface-2 rounded-2xl p-5 text-left space-y-3">
            <BookingDetail icon={<Calendar size={16} />} label="Data" value={formatDatePtBR(selectedDate)} />
            <BookingDetail icon={<Clock size={16} />} label="Horário" value={selectedTime} />
            <BookingDetail icon={<User size={16} />} label="Serviço" value={combinedService?.name} />
            <BookingDetail icon={<Bell size={16} />} label="Lembrete" value={REMINDER_OPTIONS.find(r => r.id === reminder)?.label} />
          </div>

          <button onClick={onClose} className="btn-primary w-full">
            Fechar
          </button>
        </div>
      </ModalWrapper>
    )
  }

  return (
    <ModalWrapper onClose={onClose}>
      {/* Step Content */}
      <div className="min-h-[320px]">
        {step === 1 && (
          <StepService
            services={SERVICES}
            selected={selectedServices}
            onToggle={toggleService}
            combined={combinedService}
          />
        )}
        {step === 2 && (
          <StepDate
            days={daysInView}
            selected={selectedDate}
            onSelect={setSelectedDate}
            isAvailable={isDateAvailable}
            calendarMonth={calendarMonth}
            onPrevMonth={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
            onNextMonth={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
            today={today}
          />
        )}
        {step === 3 && (
          <StepTime
            slots={availableSlots}
            allSlots={TIME_SLOTS}
            selected={selectedTime}
            onSelect={setSelectedTime}
            selectedDate={selectedDate}
          />
        )}
        {step === 4 && (
          <StepConfirm
            service={combinedService}
            date={selectedDate}
            time={selectedTime}
            reminder={reminder}
            onReminderChange={setReminder}
            clientName={clientName}
            clientPhone={clientPhone}
            onNameChange={setClientName}
            onPhoneChange={setClientPhone}
          />
        )}
      </div>

      {/* Navigation */}
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
          {step < 4 ? (
            <>
              Continuar
              <ChevronRight size={16} />
            </>
          ) : (
            <>
              <Check size={16} />
              Confirmar Agendamento
            </>
          )}
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full sm:max-w-lg bg-surface border border-white/8 sm:rounded-3xl rounded-t-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-slide-up max-h-[95vh] overflow-y-auto no-scrollbar">
        {/* Header */}
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
        {services.map((s) => {
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
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden flex-shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                <img src={LOGO} alt="R9" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-text-muted text-xs">{s.durationDisplay}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`font-bold text-sm ${s.price ? 'text-primary' : 'text-text-muted'}`}>
                  {s.priceDisplay}
                </div>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
                ${isSelected ? 'bg-primary border-primary' : 'border-white/20 bg-transparent'}`}>
                {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Combined total */}
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
        <button
          onClick={onPrevMonth}
          disabled={isPrevDisabled}
          className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center disabled:opacity-30 hover:bg-surface-3 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize">{monthName}</span>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-text-muted text-xs font-medium py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />
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
                    ? `bg-surface-2 hover:bg-surface-3 hover:border-primary/30 border border-transparent text-text
                       ${isToday ? 'border-primary/40 text-primary' : ''}`
                    : 'bg-surface/50 text-text-muted/30 cursor-not-allowed'
                }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {selected && (
        <p className="text-center text-primary text-xs font-medium mt-4 capitalize">
          {formatDatePtBR(selected)}
        </p>
      )}
    </div>
  )
}

function StepTime({ slots, allSlots, selected, onSelect, selectedDate }) {
  return (
    <div>
      <h3 className="text-base font-bold mb-1">Qual horário?</h3>
      {selectedDate && (
        <p className="text-text-muted text-xs mb-4 capitalize">
          {formatDatePtBR(selectedDate)}
        </p>
      )}
      <div className="grid grid-cols-4 gap-2">
        {allSlots.map((time) => {
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
                    ? 'bg-surface-2 text-text hover:bg-surface-3 hover:border-primary/30 border border-transparent'
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

function StepConfirm({ service, date, time, reminder, onReminderChange, clientName, clientPhone, onNameChange, onPhoneChange }) {
  const formatPhone = (val) => {
    const nums = val.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return nums
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`
    if (nums.length <= 11) return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`
    return val
  }

  return (
    <div className="space-y-5">
      <div className="bg-surface-2 rounded-2xl p-4 space-y-2.5">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Resumo</h4>
        <BookingDetail icon={<User size={14} />} label="Serviço" value={service?.name} />
        <BookingDetail icon={<Calendar size={14} />} label="Data" value={date ? formatDatePtBR(date) : ''} />
        <BookingDetail icon={<Clock size={14} />} label="Horário" value={time} />
        <BookingDetail icon={<span className="text-xs font-bold text-primary">R$</span>} label="Valor" value={service?.priceDisplay} />
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Seus dados</h4>
        <div className="relative">
          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Seu nome"
            value={clientName}
            onChange={(e) => onNameChange(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="tel"
            placeholder="(11) 99999-9999"
            value={clientPhone}
            onChange={(e) => onPhoneChange(formatPhone(e.target.value))}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Bell size={13} />
          Quando deseja ser lembrado?
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {REMINDER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onReminderChange(opt.id)}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold text-center transition-all duration-200
                ${reminder === opt.id
                  ? 'bg-primary/20 border border-primary/50 text-primary'
                  : 'bg-surface-2 border border-white/8 text-text-muted hover:border-white/20 hover:text-text'
                }`}
            >
              {opt.label}
            </button>
          ))}
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
