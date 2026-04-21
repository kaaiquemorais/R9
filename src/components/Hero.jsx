import { Scissors } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Hero({ onBookNow }) {
  const { profile, signInWithGoogle, signOut } = useAuth()

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

      {/* Auth bar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {profile ? (
          <>
            {profile.avatar && (
              <img src={profile.avatar} alt={profile.name} className="w-7 h-7 rounded-full object-cover border border-white/20" />
            )}
            <span className="text-xs text-white/70 hidden sm:block">{profile.name.split(' ')[0]}</span>
            <button
              onClick={signOut}
              className="text-xs text-white/50 hover:text-white/80 transition-colors border border-white/15 rounded-lg px-3 py-1.5"
            >
              Sair
            </button>
          </>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white border border-white/15 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>
        )}
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
                src="https://i.postimg.cc/Vs2HNR1x/logo-r9-certo.png"
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
