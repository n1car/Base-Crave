import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { reservationsAPI } from '../api/client'
import { Reservation } from '../types'
import BottomNav from '../components/BottomNav'
import styles from './Orders.module.css'

const CheckIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function OrdersReady() {
  const navigate = useNavigate()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<Reservation | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerId = 'qr-reader-orders'
  const scannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadReservations()
    const interval = setInterval(loadReservations, 12000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (showScanner) {
      scannerTimerRef.current = setTimeout(() => startScanner(), 200)
    }
    return () => { stopScanner() }
  }, [showScanner])

  const loadReservations = async () => {
    try {
      const { data } = await reservationsAPI.getStore()
      setReservations(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const ready = reservations.filter(r => r.status === 'ready')

  const openCodeInput = (order: Reservation) => {
    setCurrentOrder(order)
    setCodeInput('')
    setCodeError('')
    setShowCodeInput(true)
  }

  const closeCodeInput = () => {
    stopScanner()
    setShowCodeInput(false)
    setCurrentOrder(null)
    setCodeInput('')
    setCodeError('')
    setShowScanner(false)
  }

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode(scannerId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10 },
        onScanSuccess,
        (errorMessage) => console.warn('[QR Scanner] Scan failure:', errorMessage)
      )
      setScannerReady(true)
    } catch {
      setScannerReady(false)
    }
  }

  const stopScanner = async () => {
    if (scannerTimerRef.current) {
      clearTimeout(scannerTimerRef.current)
      scannerTimerRef.current = null
    }
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
      setScannerReady(false)
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner()
    setShowScanner(false)
    if (!currentOrder) return
    setCodeInput(decodedText.toUpperCase())
    setVerifying(true)
    setCodeError('')
    try {
      await reservationsAPI.verify(currentOrder.id, decodedText.toUpperCase())
      setShowCodeInput(false)
      setShowSuccess(true)
      loadReservations()
    } catch {
      setCodeError('Código incorrecto. Intenta de nuevo.')
    } finally {
      setVerifying(false)
    }
  }

  const openScanner = () => {
    setCodeError('')
    setShowScanner(true)
  }

  const closeScanner = () => {
    stopScanner()
    setShowScanner(false)
  }

  const handleVerifyCode = async () => {
    if (!currentOrder || !codeInput.trim()) return

    setVerifying(true)
    setCodeError('')

    try {
      await reservationsAPI.verify(currentOrder.id, codeInput.trim().toUpperCase())
      setShowCodeInput(false)
      setShowSuccess(true)
      loadReservations()
    } catch (err: any) {
      setCodeError('Código incorrecto. Intenta de nuevo.')
    } finally {
      setVerifying(false)
    }
  }

  const closeSuccess = () => {
    setShowSuccess(false)
    setCurrentOrder(null)
    setCodeInput('')
  }

  const formatTime = (iso: string) => {
    if (!iso) return '12-5 PM'
    const d = new Date(iso)
    const h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    return `${displayH}:${m} ${ampm}`
  }

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`
  }

  const renderOrderCard = (res: Reservation) => {
    const packTitle = res.packs?.title || res.packs?.pack_type === 'surprise' ? 'Surprise Pack' : 'Pack'
    const customerName = res.users?.name || 'Customer'
    const price = res.packs?.price || 0
    const pickupTime = formatTime(res.packs?.pickup_start || '')

    return (
      <div key={res.id} className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.orderIdTop}>Order ORD-{res.id.slice(0, 4).toUpperCase()}</div>
          <div className={styles.cardHeader}>
            <div className={styles.packageName}>{packTitle}</div>
            <div className={styles.price}>{formatPrice(price * res.quantity)}</div>
          </div>
          <div className={styles.customerInfo}>
            <div className={styles.infoCol}>
              <span className={styles.infoLabel}>Customer</span>
              <span className={styles.infoValue}>{customerName}</span>
            </div>
            <div className={styles.infoCol}>
              <span className={styles.infoLabel}>Pickup Time</span>
              <span className={styles.infoValue}>{pickupTime}</span>
            </div>
          </div>
        </div>
        <div className={styles.cardActions}>
          <button className={styles.scanBtn} onClick={() => openCodeInput(res)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3H5a2 2 0 0 0-2 2v2"></path>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
              <path d="M3 17v2a2 2 0 0 0 2 2h2"></path>
            </svg>
            Scan QR Code
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.orders}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Orders</div>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.containerFilter}>
          <div className={styles.filterBtn} onClick={() => navigate('/orders')}>
            <span>Pending</span>
          </div>
          <div className={styles.filterBtn} onClick={() => navigate('/orders/in-progress')}>
            <span>In Progress</span>
          </div>
          <div className={`${styles.filterBtn} ${styles.filterBtnActive}`}>
            <span>Ready</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : ready.length === 0 ? (
        <div className={styles.empty}>
          <p>No orders ready for pickup</p>
        </div>
      ) : (
        <div className={styles.cardsContainer}>
          {ready.map(res => renderOrderCard(res))}
        </div>
      )}

      {showCodeInput && currentOrder && (
        <div className={styles.modalOverlay} onClick={closeCodeInput}>
          <div className={`${styles.modal} ${showScanner ? styles.modalWide : ''}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Enter Pickup Code</h3>
              <button className={styles.closeBtn} onClick={closeCodeInput}>
                <XIcon />
              </button>
            </div>
            <div className={styles.modalContent}>
              {!showScanner ? (
                <>
                  <p className={styles.modalSubtitle}>
                    Ask the customer for their pickup code
                  </p>
                  <input
                    type="text"
                    className={styles.codeInput}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="XXXXXX"
                    maxLength={6}
                    autoFocus
                  />
                  {codeError && <p className={styles.codeError}>{codeError}</p>}
                  <button
                    className={styles.verifyBtn}
                    onClick={handleVerifyCode}
                    disabled={verifying || codeInput.length < 4}
                  >
                    {verifying ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <button className={styles.scanQrBtn} onClick={openScanner}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 3H5a2 2 0 0 0-2 2v2" />
                      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                      <path d="M3 17v2a2 2 0 0 0 2 2h2" />
                    </svg>
                    Scan QR Code
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.modalSubtitle}>Point the camera at the customer's QR code</p>
                  <div className={styles.scannerContainer}>
                    <div id={scannerId} className={styles.qrReader} />
                    {!scannerReady && (
                      <div className={styles.scannerLoading}>Starting camera...</div>
                    )}
                  </div>
                  {codeError && <p className={styles.codeError}>{codeError}</p>}
                  <button className={styles.switchBtn} onClick={closeScanner}>
                    Enter code manually
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccess && currentOrder && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.successIcon}>
                <CheckIcon />
              </div>
              <h3>Order Completed!</h3>
              <p className={styles.successSubtitle}>
                The order has been successfully delivered
              </p>
              <button className={styles.doneBtn} onClick={closeSuccess}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: '60px' }} />
      <BottomNav active="orders" />
    </div>
  )
}