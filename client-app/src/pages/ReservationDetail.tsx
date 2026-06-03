import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { reservationsAPI, Reservation } from '../api/client'
import styles from './ReservationDetail.module.css'

const ChevronLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
)

const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const NavigationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
  </svg>
)

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CO')}`
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'May 1, 2026'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return 'May 1, 2026'
  }
}

function formatTimeRange(startStr: string, endStr: string) {
  if (!startStr || !endStr) return '2:00 PM - 7:00 PM'
  try {
    const formatTime = (d: Date) => {
      let h = d.getHours()
      const m = d.getMinutes()
      const ampm = h >= 12 ? 'PM' : 'AM'
      h = h % 12 || 12
      return `${h}:${m.toString().padStart(2, '0')} ${ampm}`
    }
    const start = new Date(startStr)
    const end = new Date(endStr)
    return `${formatTime(start)} - ${formatTime(end)}`
  } catch {
    return '2:00 PM - 7:00 PM'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'reserved': return 'Reserved'
    case 'in_process': return 'In Process'
    case 'ready': return 'Ready'
    case 'picked_up': return 'Completed'
    case 'cancelled': return 'Cancelled'
    case 'expired': return 'Expired'
    default: return status
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'reserved': return '#9dfe00'
    case 'in_process': return '#f59e0b'
    case 'ready': return '#22c55e'
    case 'picked_up': return '#6b7280'
    case 'cancelled': return '#ef4444'
    case 'expired': return '#6b7280'
    default: return '#9dfe00'
  }
}

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadReservation()
    const interval = setInterval(loadReservation, 5000)
    return () => clearInterval(interval)
  }, [id])

  const loadReservation = async () => {
    try {
      setLoading(true)
      const { data } = await reservationsAPI.getById(id!)
      setReservation(data)
      console.log('=== RESERVATION DEBUG ===')
      console.log('Full reservation:', JSON.stringify(data, null, 2))
      console.log('Pack:', JSON.stringify(data.packs, null, 2))
      console.log('Store:', JSON.stringify(data.packs?.stores, null, 2))
      console.log('store.image_url:', data.packs?.stores?.image_url)
      console.log('store.users?.profile_image:', data.packs?.stores?.users?.profile_image)
    } catch (error) {
      console.error('Failed to load reservation:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ChevronLeftIcon />
          </button>
        </div>
        <div className={styles.error}>Reservation not found</div>
      </div>
    )
  }

  const store = reservation.packs?.stores
  const pack = reservation.packs
  const statusColor = getStatusColor(reservation.status)

  const handleGetDirections = () => {
    if (store?.latitude && store?.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`, '_blank')
    }
  }

  const handleViewQR = () => {
    navigate(`/qr/${reservation.id}`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ChevronLeftIcon />
        </button>
      </div>

      <div className={styles.statusBadge}>
        <div className={styles.statusDot} style={{ backgroundColor: statusColor }} />
        <span className={styles.statusText}>{getStatusLabel(reservation.status)}</span>
        <span className={styles.reservationId}>#{reservation.id?.slice(0, 16).toUpperCase()}</span>
      </div>

      <div className={styles.card}>
        <div className={styles.storeRow}>
          <div className={styles.storeImageContainer}>
            {store?.image_url || store?.users?.profile_image ? (
              <img src={store.image_url || store.users!.profile_image} alt={store.name} className={styles.storeImage} />
            ) : (
              <div className={styles.storeImagePlaceholder}>
                {store?.name?.substring(0, 2).toUpperCase() || 'FR'}
              </div>
            )}
          </div>
          <div className={styles.storeInfo}>
            <h2>{store?.name || 'Store Name'}</h2>
            <div className={styles.storeAddress}>
              <MapPinIcon />
              <span>{store?.address || 'Address not available'}</span>
            </div>
          </div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Pack</div>
          <div className={styles.detailValue}>{pack?.title || pack?.pack_type === 'surprise' ? 'Surprise Pack' : 'Pack Name'}</div>
        </div>

        <div className={styles.rowGroup}>
          <div className={styles.rowHalf}>
            <div className={styles.detailLabel}>
              <CalendarIcon />
              Date
            </div>
            <div className={styles.detailValue}>{formatDate(pack?.pickup_start)}</div>
          </div>
          <div className={styles.rowHalf}>
            <div className={styles.detailLabel}>
              <ClockIcon />
              Time
            </div>
            <div className={styles.detailValue}>{formatTimeRange(pack?.pickup_start || '', pack?.pickup_end || '')}</div>
          </div>
        </div>

        <div className={styles.priceRow}>
          <div className={styles.priceLabel}>Price</div>
          <div className={styles.priceValue}>{formatPrice(pack?.price || reservation.quantity * 12000)}</div>
        </div>
      </div>

      <div className={styles.instructionsCard}>
        <div className={styles.instructionsHeader}>
          <InfoIcon />
          <span>Pick-up instructions</span>
        </div>
        <div className={styles.instructionsList}>
          <div className={styles.instructionItem}>• Arrive during the indicated time</div>
          <div className={styles.instructionItem}>• Show your QR code to staff</div>
          <div className={styles.instructionItem}>• Pay the amount when picking up your pack</div>
        </div>
      </div>

      <button className={styles.directionsButton} onClick={handleGetDirections}>
        <NavigationIcon />
        <span>Get Directions</span>
      </button>

      <button className={styles.qrButton} onClick={handleViewQR}>
        View QR Code
      </button>
    </div>
  )
}
