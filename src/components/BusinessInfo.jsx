import { MapPin, Phone, CreditCard, Clock, Instagram } from 'lucide-react'
import { BUSINESS_INFO, PAYMENT_METHODS } from '../data/services'

export default function BusinessInfo() {
  return (
    <section id="localizacao" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Background Glow */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-primary text-xs font-bold tracking-widest uppercase mb-3 block">
            Onde Estamos
          </span>
          <h2 className="text-4xl sm:text-5xl font-black">
            Nos <span className="glow-text">encontre</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Location */}
          <InfoCard
            icon={<MapPin size={20} className="text-primary" />}
            title="Localização"
            id="localizacao-card"
          >
            <p className="text-text text-sm font-medium leading-relaxed">
              {BUSINESS_INFO.address}
            </p>
            <p className="text-text-muted text-sm">{BUSINESS_INFO.city}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${BUSINESS_INFO.address}, ${BUSINESS_INFO.city}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline mt-2"
            >
              Ver no mapa →
            </a>
          </InfoCard>

          {/* Contact */}
          <InfoCard
            icon={<Phone size={20} className="text-primary" />}
            title="Contato"
            id="contato"
          >
            {BUSINESS_INFO.phones.map((phone) => (
              <a
                key={phone}
                href={`tel:${phone.replace(/\D/g, '')}`}
                className="block text-text text-sm font-medium hover:text-primary transition-colors duration-200"
              >
                {phone}
              </a>
            ))}
            <a
              href={`https://wa.me/5511996665871`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline mt-2"
            >
              WhatsApp →
            </a>
          </InfoCard>

          {/* Hours */}
          <InfoCard
            icon={<Clock size={20} className="text-primary" />}
            title="Horários"
          >
            <p className="text-text text-sm">{BUSINESS_INFO.hours.weekdays}</p>
            <p className="text-text text-sm">{BUSINESS_INFO.hours.saturday}</p>
            <p className="text-text-muted text-sm">{BUSINESS_INFO.hours.sunday}</p>
          </InfoCard>

          {/* Payment */}
          <InfoCard
            icon={<CreditCard size={20} className="text-primary" />}
            title="Pagamentos"
          >
            {PAYMENT_METHODS.map((method) => (
              <div key={method} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-text text-sm">{method}</span>
              </div>
            ))}
          </InfoCard>
        </div>

        {/* Map Preview */}
        <div className="mt-8 rounded-2xl overflow-hidden border border-white/8 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <iframe
            title="Localização R9 Barbearia"
            src="https://maps.google.com/maps?q=Rua+Fernando+de+Noronha,+100,+Residencial+das+Ilhas,+Bragança+Paulista,+SP,+12913-004&output=embed&hl=pt"
            width="100%"
            height="280"
            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) saturate(0.8)' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Ponto de referência */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <MapPin size={14} className="text-primary flex-shrink-0" />
          <p className="text-text-muted text-sm text-center">
            Ao lado do <span className="text-primary font-semibold">Supermercado União — Unidade 5</span>
          </p>
        </div>
      </div>
    </section>
  )
}

function InfoCard({ icon, title, children, id }) {
  return (
    <div id={id} className="card card-hover p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  )
}
