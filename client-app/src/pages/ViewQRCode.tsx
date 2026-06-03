import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { reservationsAPI } from '../api/client'
import { Reservation } from '../types'
import styles from './ViewQRCode.module.css'

const MapPinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const ClockWarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

function formatTimeRange(startStr?: string, endStr?: string) {
  if (!startStr || !endStr) return ''
  try {
    const start = new Date(startStr)
    const end = new Date(endStr)
    const formatTime = (d: Date) => {
      let h = d.getHours()
      const m = d.getMinutes()
      const ampm = h >= 12 ? 'PM' : 'AM'
      h = h % 12 || 12
      return `${h}:${m.toString().padStart(2, '0')} ${ampm}`
    }
    return `${formatTime(start)} - ${formatTime(end)}`
  } catch (e) {
    return ''
  }
}

function formatTimeSingle(timeStr?: string) {
  if (!timeStr) return ''
  try {
    const d = new Date(timeStr)
    let h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`
  } catch (e) {
    return ''
  }
}

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CO')}`
}

export default function ViewQRCode() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReservation = useCallback(async (resId: string) => {
    try {
      const { data } = await reservationsAPI.getById(resId)
      setReservation(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!id) return
    loadReservation(id)
    const interval = setInterval(() => loadReservation(id), 5000)
    return () => clearInterval(interval)
  }, [id, loadReservation])

  const handleGetDirections = () => {
    if (reservation?.packs?.stores?.latitude && reservation?.packs?.stores?.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${reservation.packs.stores.latitude},${reservation.packs.stores.longitude}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className={styles.appContainer}>
        <div className={styles.container}>
          <div className={styles.loadingText}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className={styles.appContainer}>
        <div className={styles.container}>
          <div className={styles.loadingText}>Reservation not found</div>
        </div>
      </div>
    )
  }

  const isCompleted = reservation.status === 'picked_up'
  const storeName = reservation.packs?.stores?.name || 'Store'
  const storeAddress = reservation.packs?.stores?.address || 'Address not available'
  const packTitle = reservation.packs?.pack_type === 'surprise' ? 'Surprise Pack' : reservation.packs?.title
  const packPrice = reservation.packs?.price || 0
  const pickupStart = reservation.packs?.pickup_start
  const pickupEnd = reservation.packs?.pickup_end
  const pickupCode = reservation.pickup_code || '---'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${pickupCode}&color=000000&bgcolor=ffffff`
  const formattedCode = pickupCode

  if (isCompleted) {
    return (
      <div className={styles.appContainer}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.headerTitle}>Order Completed!</h1>
            <p className={styles.headerSubtitle}>Your pack has been picked up successfully</p>
          </header>
          <div className={styles.content}>
            <div className={styles.detailsCard}>
              <div className={styles.statusRow}>
                <div className={styles.statusDot} style={{ backgroundColor: '#6b7280' }}></div>
                <span className={styles.statusText}>Completed</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Restaurant</span>
                <span className={styles.detailValue}>{storeName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Pack</span>
                <span className={styles.detailValue}>{packTitle}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Paid in store</span>
                <span className={styles.detailValueOrange}>{formatPrice(packPrice * reservation.quantity)}</span>
              </div>
            </div>
            <button className={styles.doneButton} onClick={() => navigate('/profile')}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.appContainer}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Your Pick-Up Code</h1>
          <p className={styles.headerSubtitle}>Show this code at the restaurant</p>
        </header>

        <div className={styles.content}>
          <div className={styles.qrWrapper}>
            <img src={qrUrl} alt="QR Code" className={styles.qrImage} />
          </div>
          
          <div className={styles.codeContainer}>
            <p className={styles.codeLabel}>Reservation Code</p>
            <div className={styles.codeText}>{formattedCode}</div>
          </div>

          <div className={styles.detailsCard}>
            <div className={styles.statusRow}>
              <div className={styles.statusDot} style={{ backgroundColor: reservation.status === 'ready' ? '#22c55e' : '#f59e0b' }}></div>
              <span className={styles.statusText}>
                {reservation.status === 'ready' ? 'Ready for Pick Up' :
                 reservation.status === 'in_process' ? 'In Process' :
                 reservation.status === 'reserved' ? 'Reserved' : 'Ready for Pick Up'}
              </span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Restaurant</span>
              <span className={styles.detailValue}>{storeName}</span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Location</span>
              <span className={styles.detailValue}>{storeAddress}</span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pick up time</span>
              <span className={styles.detailValue}>{formatTimeRange(pickupStart, pickupEnd)}</span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pack</span>
              <span className={styles.detailValue}>{packTitle}</span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pay in store</span>
              <span className={styles.detailValueOrange}>{formatPrice(packPrice * reservation.quantity)}</span>
            </div>
          </div>

          <button className={styles.directionsButton} onClick={handleGetDirections}>
            <MapPinIcon />
            <span>Get Directions</span>
          </button>
          
          <div className={styles.warningBox}>
            <div className={styles.warningIconWrapper}>
              <ClockWarningIcon />
            </div>
            <div className={styles.warningTextContainer}>
              <p className={styles.warningTitle}>Code expires at {formatTimeSingle(pickupEnd)}</p>
              <p className={styles.warningSubtitle}>Make sure to pick up before the window closes</p>
            </div>
          </div>
          
          <button 
            className={styles.doneButton}
            onClick={() => navigate('/profile')}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
