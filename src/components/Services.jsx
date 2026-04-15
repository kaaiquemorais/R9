import { Clock, DollarSign, Zap, ArrowRight, Scissors } from 'lucide-react'
import { SERVICES } from '../data/services'

function BeardIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a4 4 0 0 1 4 4v1c0 1-.4 2-1 2.7" />
      <path d="M8 10.7C7.4 10 7 9 7 8V7a4 4 0 0 1 4-4" />
      <path d="M6 13c0 3.5 2 6 6 6s6-2.5 6-6" />
      <path d="M6 13c1 1 2.5 1.5 4 1" />
      <path d="M18 13c-1 1-2.5 1.5-4 1" />
      <path d="M10 14c0 1.5.5 3 2 3s2-1.5 2-3" />
    </svg>
  )
}

function ServiceIcon({ name, size = 18, className }) {
  if (name === 'BeardIcon') return <BeardIcon size={size} className={className} />
  return <Scissors size={size} className={className} />
}

export default function Services({ onBookService }) {
  return (
    <section id="servicos" className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-xs font-bold tracking-widest uppercase mb-3 block">
            Nossos Serviços
          </span>
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            Escolha seu{' '}
            <span className="glow-text">estilo</span>
          </h2>
          <p className="text-text-muted text-lg max-w-md mx-auto">
            Serviços premium com profissionais especializados
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((service, i) => (
            <ServiceCard
              key={service.id}
              service={service}
              onBook={() => onBookService(service)}
              delay={i * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function ServiceCard({ service, onBook }) {
  const isConsult = service.price === null

  return (
    <div
      className={`card card-hover group relative overflow-hidden p-6 flex flex-col gap-4 cursor-pointer
        ${service.highlight ? 'border-primary/30 shadow-[0_0_40px_rgba(255,106,0,0.1)]' : ''}`}
      onClick={onBook}
    >
      {/* Highlight Badge */}
      {service.highlight && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary-light text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-[0_0_15px_rgba(255,106,0,0.4)]">
          <Zap size={10} />
          POPULAR
        </div>
      )}

      {/* Background Glow on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      </div>

      {/* Icon */}
      <div className="relative w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <ServiceIcon name={service.iconName} size={22} className="text-primary" />
      </div>

      {/* Content */}
      <div className="relative flex-1">
        <h3 className="text-lg font-bold text-text mb-1">{service.name}</h3>
        <p className="text-text-muted text-sm leading-relaxed">{service.description}</p>
      </div>

      {/* Details */}
      <div className="relative flex items-center gap-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <DollarSign size={13} className="text-primary" />
          <span className={`font-bold text-sm ${isConsult ? 'text-text-muted' : 'text-text'}`}>
            {service.priceDisplay}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-primary" />
          <span className="text-text-muted text-sm">{service.durationDisplay}</span>
        </div>
      </div>

      {/* CTA */}
      <button
        className={`relative w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300
          ${service.highlight
            ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-[0_0_20px_rgba(255,106,0,0.3)] hover:shadow-[0_0_30px_rgba(255,106,0,0.5)]'
            : 'bg-surface-2 text-text group-hover:bg-primary/15 group-hover:text-primary border border-transparent group-hover:border-primary/30'
          }`}
      >
        Agendar
        <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </div>
  )
}
