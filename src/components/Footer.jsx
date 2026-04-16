import { useRef } from 'react'
import { Instagram, Phone } from 'lucide-react'

export default function Footer({ onBookNow, onOpenAdmin }) {
  const holdTimer = useRef(null)

  const startHold = () => {
    holdTimer.current = setTimeout(() => {
      onOpenAdmin()
    }, 5000)
  }

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  return (
    <footer className="relative border-t border-white/5 overflow-hidden">
      {/* Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* CTA Banner */}
        <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-3xl p-8 sm:p-12 text-center mb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial-glow opacity-60" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              Pronto para um novo <span className="glow-text">visual</span>?
            </h2>
            <p className="text-text-muted mb-8 max-w-md mx-auto">
              Agende agora e garanta seu horário com os melhores barbeiros de Bragança Paulista
            </p>
            <button
              onClick={onBookNow}
              className="btn-primary mx-auto"
            >
              AGENDAR AGORA
            </button>
          </div>
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <img
              src="https://i.postimg.cc/Vs2HNR1x/logo-r9-certo.png"
              alt="R9 Barbearia"
              className="h-10 w-auto object-contain lg:-ml-1"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <span className="text-3xl font-black glow-text hidden">R9</span>
            <p className="text-text-muted text-sm leading-relaxed max-w-xs">
              Barbearia premium em Bragança Paulista. Estilo, qualidade e excelência em cada{' '}
              <span
                className="select-none cursor-default"
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
              >
                corte
              </span>
              .
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Navegação</h4>
            {[
              { label: 'Serviços', href: '#servicos' },
              { label: 'Localização', href: '#localizacao' },
              { label: 'Contato', href: '#contato' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-text-muted hover:text-primary transition-colors duration-200 text-sm"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Contato</h4>
            <a
              href="tel:11996665871"
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm"
            >
              <Phone size={14} />
              (11) 99666-5871
            </a>
            <a
              href="tel:1134031338"
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm"
            >
              <Phone size={14} />
              (11) 3403-1338
            </a>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm"
            >
              <Instagram size={14} />
              @r9barbearia
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-center pt-8 border-t border-white/5">
          <p className="text-text-muted text-xs text-center">
            © R9 Barbearia. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
