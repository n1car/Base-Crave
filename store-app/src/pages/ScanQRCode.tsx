import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { reservationsAPI } from '../api/client'
import styles from './ScanQRCode.module.css'
import BottomNav from '../components/BottomNav'

const ScannerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" y1="12" x2="17" y2="12" />
  </svg>
)

export default function ScanQRCode() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'scanner' | 'manual'>('scanner')
  const [pickup_code, setPickupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startScanner()
    return () => {
      stopScanner()
    }
  }, [])

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10 },
        onScanSuccess,
        onScanFailure
      )
      setScannerReady(true)
    } catch {
      setMode('manual')
    }
  }

  const stopScanner = async () => {
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
    setPickupCode(decodedText.toUpperCase())
    await handleVerify(decodedText.toUpperCase())
  }

  const onScanFailure = (errorMessage: string) => {
    console.warn('[QR Scanner] Scan failure:', errorMessage)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!pickup_code.trim()) return
    await handleVerify(pickup_code.trim().toUpperCase())
  }

  const handleVerify = async (code: string) => {
    setLoading(true)
    setError('')

    try {
      await reservationsAPI.verifyByCode(code)
      setSuccess(true)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Invalid pickup code')
      } else if (err.response?.status === 403) {
        setError('Unauthorized')
      } else if (err.response?.status === 400) {
        setError(err.response.data?.error || 'Reservation cannot be verified yet')
      } else {
        setError('Verification failed. Please try again.')
      }
      if (scannerReady && scannerRef.current) {
        startScanner()
      }
    } finally {
      setLoading(false)
    }
  }

  const switchToManual = () => {
    stopScanner()
    setMode('manual')
    setPickupCode('')
    setError('')
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.icon}>✅</div>
          <h1>Success!</h1>
          <p>Order has been marked as picked up.</p>
          <button
            className={styles.button}
            onClick={() => navigate('/orders/ready')}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Scan QR Code</h1>
      </header>

      <div className={styles.content}>
        {mode === 'scanner' && (
          <>
            <p className={styles.instruction}>Point the camera at the customer's QR code</p>

            <div className={styles.scannerContainer}>
              <div id="qr-reader" ref={scannerContainerRef} className={styles.qrReader} />
              {!scannerReady && (
                <div className={styles.scannerLoading}>
                  <ScannerIcon />
                  <p>Starting camera...</p>
                </div>
              )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button className={styles.switchButton} onClick={switchToManual}>
              Enter code manually
            </button>
          </>
        )}

        {mode === 'manual' && (
          <>
            <p className={styles.instruction}>Enter the pickup code from the customer</p>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="text"
                value={pickup_code}
                onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                placeholder="Enter pickup code"
                className={styles.codeInput}
                maxLength={6}
                required
                autoFocus
              />
              <button type="submit" className={styles.verifyButton} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </>
        )}
      </div>
      <BottomNav active="orders" />
    </div>
  )
}
