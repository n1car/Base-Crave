import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { packsAPI, reservationsAPI, storesAPI } from '../api/client'
import { Pack, Store, Reservation } from '../types'
import styles from './ReserveProduct.module.css'

const CheckIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
)

const XIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const ClockIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

function formatTimeRange(startStr: string, endStr: string) {
  if (!startStr || !endStr) return ''
  try {
    const start = new Date(startStr)
    const end = new Date(endStr)
    const formatTime = (d: Date) => {
      let h = d.getHours()
      const ampm = h >= 12 ? 'PM' : 'AM'
      h = h % 12 || 12
      return `${h}:00 ${ampm}`
    }
    return `${formatTime(start)} - ${formatTime(end)}`
  } catch {
    return ''
  }
}

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CO')}`
}

export default function ReserveProduct() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pack, setPack] = useState<Pack | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState(false)
  const [reservationData, setReservationData] = useState<Reservation | null>(null)

  useEffect(() => {
    if (id) {
      loadData(id)
    }
  }, [id])

  const loadData = async (packId: string) => {
    try {
      const { data: foundPack } = await packsAPI.getById(packId)
      setPack(foundPack)
      if (foundPack.store_id) {
        const { data: storeData } = await storesAPI.getById(foundPack.store_id)
        setStore(storeData)
      }
      
      const { data: myRes } = await reservationsAPI.getMy()
      const existing = myRes.find((r: Reservation) => r.pack_id === packId && ['reserved', 'in_process', 'ready'].includes(r.status))
      if (existing) {
        setReservationData(existing)
        if (existing.status === 'in_process' || existing.status === 'ready') {
          navigate(`/reservation/${existing.id}`, { replace: true })
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleReserve = async () => {
    if (!pack) return
    
    setReserving(true)
    try {
      const reservationQty = quantity
      const { data } = await reservationsAPI.create({ pack_id: pack.id, quantity: reservationQty })
      setReservationData(data)
    } catch (error) {
      console.error(error)
    } finally {
      setReserving(false)
    }
  }

  const handleRefreshStatus = async () => {
    if (!reservationData) return
    try {
      const { data } = await reservationsAPI.getById(reservationData.id)
      setReservationData(data)
      const isConfirmed = data.status === 'in_process' || data.status === 'ready' || data.status === 'picked_up'
      if (isConfirmed) {
        navigate(`/reservation/${data.id}`, { replace: true })
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (reservationData?.status !== 'reserved') return
    let timerId: ReturnType<typeof setTimeout>
    const poll = () => {
      handleRefreshStatus().finally(() => {
        timerId = setTimeout(poll, 5000)
      })
    }
    timerId = setTimeout(poll, 5000)
    return () => clearTimeout(timerId)
  }, [reservationData?.status])

  const handleGoToProfile = () => {
    navigate('/profile')
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

  if (!pack || !store) {
    return (
      <div className={styles.appContainer}>
        <div className={styles.container}>
          <div className={styles.loadingText}>Pack not found</div>
        </div>
      </div>
    )
  }

  if (reservationData) {
    const isConfirmed = reservationData.status === 'in_process' || reservationData.status === 'ready' || reservationData.status === 'picked_up'
    const isCancelled = reservationData.status === 'cancelled'

    if (isConfirmed) {
      return (
        <div className={styles.appContainer}>
          <div className={styles.container}>
            <div className={styles.successContent}>
              <div className={styles.successHeader}>
                <div className={styles.checkIconWrapper}>
                  <CheckIcon />
                </div>
                <h1 className={styles.successTitle}>Reservation<br/>Confirmed!</h1>
                <p className={styles.successSubtitle}>Your pack has been successfully reserved</p>
              </div>

              <div className={styles.detailsCard}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Reservation Details</h2>
                  <div className={styles.confirmedBadge}>Confirmed</div>
                </div>
                
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Restaurant</span>
                  <span className={styles.detailValue}>{store.name}</span>
                </div>
                
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Reservation ID</span>
                  <span className={styles.detailValue}>#{reservationData.id.split('-')[0].toUpperCase()}</span>
                </div>
                
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Pick up time</span>
                  <span className={styles.detailValue}>{formatTimeRange(pack.pickup_start, pack.pickup_end)}</span>
                </div>
                
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Pack</span>
                  <span className={styles.detailValue}>{pack.pack_type === 'surprise' ? 'Surprise Pack' : pack.title}</span>
                </div>

                <div className={styles.divider}></div>

                <div className={styles.detailRow}>
                  <span className={styles.detailLabelMain}>Pack price</span>
                  <span className={styles.detailValueMain}>{formatPrice(pack.price * reservationData.quantity)}</span>
                </div>
              </div>

              <div className={styles.infoBox}>
                <div className={styles.infoHeader}>
                  <InfoIcon />
                  <span>Next steps</span>
                </div>
                <p className={styles.infoText}>
                  Show your QR code at the restaurant during pick up time. You will pay directly there.
                </p>
              </div>
            </div>

            <div className={styles.bottomBar}>
              <button
                className={styles.primaryButton}
                onClick={() => navigate(`/qr/${reservationData.id}`)}
              >
                View QR code
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (isCancelled) {
      return (
        <div className={styles.appContainer}>
          <div className={styles.container}>
            <div className={styles.successContent}>
              <div className={styles.successHeader}>
                <div className={styles.checkIconWrapper}>
                  <XIcon />
                </div>
                <h1 className={styles.successTitle}>Reservation<br/>Cancelled</h1>
                <p className={styles.successSubtitle}>The restaurant has cancelled your order</p>
              </div>

              <div className={styles.infoBox} style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <p className={styles.infoText}>
                  Your reservation has been cancelled by the restaurant.
                </p>
              </div>
            </div>

            <div className={styles.bottomBar}>
              <button
                className={styles.primaryButton}
                onClick={handleGoToProfile}
              >
                Back to Profile
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.appContainer}>
        <div className={styles.container}>
          <div className={styles.successContent}>
            <div className={styles.successHeader}>
              <div className={styles.pendingIconWrapper}>
                <ClockIcon />
              </div>
              <h1 className={styles.successTitle}>Waiting for<br/>Confirmation</h1>
              <p className={styles.successSubtitle}>The restaurant is reviewing your order</p>
            </div>

            <div className={styles.detailsCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Reservation Details</h2>
                <div className={styles.pendingBadge}>Pending</div>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Restaurant</span>
                <span className={styles.detailValue}>{store.name}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Reservation ID</span>
                <span className={styles.detailValue}>#{reservationData.id.split('-')[0].toUpperCase()}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Pick up time</span>
                <span className={styles.detailValue}>{formatTimeRange(pack.pickup_start, pack.pickup_end)}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Pack</span>
                <span className={styles.detailValue}>{pack.pack_type === 'surprise' ? 'Surprise Pack' : pack.title}</span>
              </div>

              <div className={styles.divider}></div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabelMain}>Pack price</span>
                <span className={styles.detailValueMain}>{formatPrice(pack.price * reservationData.quantity)}</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoHeader}>
                <InfoIcon />
                <span>Please wait</span>
              </div>
              <p className={styles.infoText}>
                We're waiting for the restaurant to confirm your order. The page will update automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.appContainer}>
      <div className={styles.container}>
        <header className={styles.header}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <div className={styles.backIconWrapper}>
              <ChevronLeftIcon />
            </div>
            <span>Back</span>
          </button>
        </header>

        <div className={styles.selectionContent}>
          <h1 className={styles.pageTitle}>Reserve Pack</h1>
          
          <div className={styles.packInfoCard}>
            <h2 className={styles.packTitle}>{pack.pack_type === 'surprise' ? 'Surprise Pack' : pack.title}</h2>
            <p className={styles.packStore}>{store.name}</p>
            <div className={styles.packPriceRow}>
              <span className={styles.packPrice}>{formatPrice(pack.price)}</span>
              <span className={styles.packPriceUnit}>each</span>
            </div>
            {pack.pack_type !== 'surprise' && (
              <p className={styles.packRemaining}>{pack.remaining_quantity} remaining</p>
            )}
          </div>

          <div className={styles.quantityCard}>
              <p className={styles.quantityLabel}>Select Quantity</p>
              <div className={styles.quantityControls}>
                <button
                  className={styles.qtyBtn}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className={styles.qtyValue}>{quantity}</span>
                <button
                  className={styles.qtyBtn}
                  onClick={() => setQuantity(Math.min(pack.remaining_quantity, quantity + 1))}
                  disabled={quantity >= pack.remaining_quantity}
                >
                  +
                </button>
              </div>
            </div>

          <div className={styles.totalCard}>
            <span className={styles.totalLabel}>Total to pay at store</span>
            <span className={styles.totalValue}>{formatPrice(pack.price * quantity)}</span>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <button
            className={styles.primaryButton}
            onClick={handleReserve}
            disabled={reserving || pack.remaining_quantity === 0}
          >
            {reserving ? 'Processing...' : 'Confirm Reservation'}
          </button>
        </div>
      </div>
    </div>
  )
}
