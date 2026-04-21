import { useState, useCallback, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { syncFromSupabase } from './utils/calendar'
import { AuthProvider } from './contexts/AuthContext'
import Hero from './components/Hero'
import Services from './components/Services'
import BookingModal from './components/BookingModal'
import BusinessInfo from './components/BusinessInfo'
import AdminDashboard from './components/AdminDashboard'
import CancelModal from './components/CancelModal'
import Footer from './components/Footer'

export default function App() {
  useEffect(() => { syncFromSupabase() }, [])

  const [bookingOpen, setBookingOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [preselectedService, setPreselectedService] = useState(null)

  const openBooking = useCallback((service = null) => {
    setPreselectedService(service)
    setBookingOpen(true)
  }, [])

  const closeBooking = useCallback(() => {
    setBookingOpen(false)
    setTimeout(() => setPreselectedService(null), 300)
  }, [])

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-text font-sans antialiased">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1E1E1E',
              color: '#F5F5F5',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
            },
            success: { iconTheme: { primary: '#FF6A00', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <main>
          <Hero onBookNow={() => openBooking()} />
          <Services onBookService={openBooking} />
          <BusinessInfo />
        </main>

        <Footer
          onBookNow={() => openBooking()}
          onOpenAdmin={() => setAdminOpen(true)}
          onOpenCancel={() => setCancelOpen(true)}
        />

        <BookingModal
          isOpen={bookingOpen}
          onClose={closeBooking}
          preselectedService={preselectedService}
        />

        <AdminDashboard
          isOpen={adminOpen}
          onClose={() => setAdminOpen(false)}
        />

        <CancelModal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
        />
      </div>
    </AuthProvider>
  )
}
