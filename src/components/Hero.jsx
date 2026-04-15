import { Scissors } from 'lucide-react'

export default function Hero({ onBookNow }) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>

      {/* Desktop: hero image fills entire section */}
      <div className="hidden lg:block absolute inset-0">
        <img
          src="https://i.postimg.cc/cJ2GBDDc/hero-R9.png"
          alt="R9 Barbearia"
          className="w-full h-full object-contain object-center"
        />
        {/* Dark overlay so content stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/90 via-[#0a0a0a]/50 to-transparent" />
      </div>

      {/* Background Glow (visible on mobile too) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[80px]" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,106,0,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,106,0,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex items-center" style={{ minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col items-center text-center pt-24 pb-20 sm:pt-28 sm:pb-24 lg:items-start lg:text-left lg:w-1/2 lg:pt-0 lg:pb-0">

            {/* Logo */}
            <div className="flex justify-center lg:justify-start mb-6 animate-fade-in">
              <img
                src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png"
                alt="R9 Barbearia"
                className="h-52 sm:h-44 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,106,0,0.35)]"
              />
            </div>

            {/* Headline */}
            <h1
              className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-[1.15] tracking-tight mb-6 animate-slide-up"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>Agende seu horário</span>
              <br />
              <span className="glow-text drop-shadow-[0_0_30px_rgba(255,106,0,0.4)]">
                em segundos
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-text-muted text-lg sm:text-lg md:text-xl mb-8 max-w-xl animate-slide-up"
              style={{ fontFamily: "'Cinzel', serif", fontWeight: 400, letterSpacing: '0.05em' }}
            >
              Rápido, simples e sem espera
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 animate-slide-up">
              <button
                onClick={onBookNow}
                className="btn-primary flex items-center gap-3 text-base"
              >
                AGENDAR AGORA
              </button>
              <a
                href="#servicos"
                className="btn-outline flex items-center gap-2 text-base"
              >
                <Scissors size={16} />
                Ver Serviços
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
