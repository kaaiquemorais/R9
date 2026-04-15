import { useState, useEffect } from 'react'
import { Menu, X, LayoutDashboard } from 'lucide-react'

export default function Header({ onBookNow, onOpenAdmin }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Serviços', href: '#servicos' },
    { label: 'Localização', href: '#localizacao' },
    { label: 'Contato', href: '#contato' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Badge Aberto Hoje */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              Aberto Hoje
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-muted hover:text-text transition-colors duration-200 text-sm font-medium tracking-wide"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors duration-200 text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary/10"
            >
              <LayoutDashboard size={16} />
              Admin
            </button>
            <button onClick={onBookNow} className="btn-primary text-sm py-2.5 px-6">
              Agendar Agora
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenAdmin}
              className="p-2 text-text-muted hover:text-primary transition-colors"
            >
              <LayoutDashboard size={20} />
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-text-muted hover:text-text transition-colors"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-xl border-t border-white/5 animate-slide-up">
          <div className="px-4 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-text-muted hover:text-text py-3 px-4 rounded-xl hover:bg-white/5 transition-all duration-200 text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => { onBookNow(); setMenuOpen(false) }}
              className="btn-primary mt-2 w-full text-center"
            >
              Agendar Agora
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
