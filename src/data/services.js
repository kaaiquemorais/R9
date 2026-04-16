export const SERVICES = [
  {
    id: 1,
    name: 'Barba',
    price: 55.0,
    priceDisplay: 'R$ 55,00',
    duration: 45,
    durationDisplay: '45 min',
    iconName: 'Scissors',
    description: 'Aparagem e modelagem completa da barba',
  },
  {
    id: 2,
    name: 'Cabelo',
    price: 58.0,
    priceDisplay: 'R$ 58,00',
    duration: 45,
    durationDisplay: '45 min',
    iconName: 'Scissors',
    description: 'Corte moderno e estilizado',
  },
  {
    id: 3,
    name: 'Cabelo e Barba',
    price: 105.0,
    priceDisplay: 'R$ 105,00',
    duration: 75,
    durationDisplay: '75 min',
    iconName: 'Scissors',
    description: 'Combo completo: corte + barba',
    highlight: true,
  },
  {
    id: 5,
    name: 'Sobrancelhas',
    price: 15.0,
    priceDisplay: 'R$ 15,00',
    duration: 15,
    durationDisplay: '15 min',
    iconName: 'Scissors',
    description: 'Design e alinhamento das sobrancelhas',
  },
  {
    id: 4,
    name: 'Pezinho',
    price: null,
    priceDisplay: 'R$ Consultar',
    duration: 15,
    durationDisplay: '15 min',
    iconName: 'Scissors',
    description: 'Acabamento e definição das entradas',
  },
  {
    id: 6,
    name: 'SPA',
    price: null,
    priceDisplay: 'R$ Consultar',
    duration: 60,
    durationDisplay: '60 min',
    iconName: 'Scissors',
    description: 'Tratamento completo de relaxamento e cuidados',
  },
]

export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30',
]

export const REMINDER_OPTIONS = [
  { id: '15m', label: '15 min antes', minutes: 15 },
  { id: '30m', label: '30 min antes', minutes: 30 },
  { id: '1h',  label: '1 hora antes', minutes: 60 },
  { id: '2h',  label: '2 horas antes', minutes: 120 },
  { id: '3h',  label: '3 horas antes', minutes: 180 },
  { id: '1d',  label: '1 dia antes', minutes: 1440 },
  { id: '2d',  label: '2 dias antes', minutes: 2880 },
]

export const PAYMENT_METHODS = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito']

export const BUSINESS_INFO = {
  name: 'R9 Barbearia',
  address: 'Rua Fernando de Noronha, 100',
  city: 'Bragança Paulista/SP',
  phones: ['(11) 99666-5871', '(11) 3403-1338'],
  hours: {
    weekdays: 'Seg – Sex: 08h às 19h',
    saturday: 'Sáb: 08h às 17h',
    sunday: 'Dom: Fechado',
  },
  instagram: '@r9barbearia',
}
