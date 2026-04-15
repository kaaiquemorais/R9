import { Scissors } from 'lucide-react'

export default function Hero({ onBookNow }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-primary-light/5 blur-[60px]" />

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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <img
            src="https://i.postimg.cc/zBrYSf50/R9-LOGO.png"
            alt="R9 Barbearia"
            className="h-40 sm:h-48 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,106,0,0.35)]"
          />
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-6 animate-slide-up">
          Agende seu horário
          <br />
          <span className="glow-text drop-shadow-[0_0_30px_rgba(255,106,0,0.4)]">
            em segundos
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-text-muted text-lg sm:text-xl md:text-2xl font-light mb-12 max-w-xl mx-auto animate-slide-up">
          Rápido, simples e sem espera
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
          <button
            onClick={onBookNow}
            className="btn-primary animate-pulse-glow flex items-center gap-3 text-base"
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
    </section>
  )
}
