import { useEffect, useRef, useState } from 'react'
import { reservationsAPI, Reservation } from '../api/client'
import { useAuthStore } from '../store/authStore'
import styles from './ReservationStatusNotifier.module.css'

type Toast = {
  id: string
  title: string
  message: string
  icon: string
}

const STATUS_COPY: Record<string, { label: string; message: string; icon: string }> = {
  reserved: {
    label: 'Reservation pending',
    message: 'Your order is waiting for the store to accept it.',
    icon: 'WAIT',
  },
  in_process: {
    label: 'Order in progress',
    message: 'The store accepted your order and is preparing it now.',
    icon: 'GO',
  },
  ready: {
    label: 'Ready for pickup',
    message: 'Your pack is ready. You can show your QR code at the store.',
    icon: 'OK',
  },
  picked_up: {
    label: 'Order completed',
    message: 'Your pickup was confirmed successfully.',
    icon: 'DONE',
  },
  cancelled: {
    label: 'Reservation cancelled',
    message: 'The store cancelled this reservation.',
    icon: '!',
  },
}

function getPackName(reservation: Reservation) {
  if (reservation.packs?.pack_type === 'surprise') return 'Surprise Pack'
  return reservation.packs?.title || 'your pack'
}

export default function ReservationStatusNotifier() {
  const { isAuthenticated } = useAuthStore()
  const [toasts, setToasts] = useState<Toast[]>([])
  const knownStatuses = useRef<Map<string, string>>(new Map())
  const initialized = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      knownStatuses.current.clear()
      initialized.current = false
      setToasts([])
      return
    }

    let cancelled = false

    const pushToast = (toast: Toast) => {
      setToasts(current => [...current, toast].slice(-3))
      window.setTimeout(() => {
        setToasts(current => current.filter(item => item.id !== toast.id))
      }, 6000)
    }

    const loadReservations = async () => {
      try {
        const { data } = await reservationsAPI.getMy()
        if (cancelled) return

        const nextStatuses = new Map<string, string>()
        data.forEach(reservation => {
          nextStatuses.set(reservation.id, reservation.status)
          const previousStatus = knownStatuses.current.get(reservation.id)
          if (!initialized.current || !previousStatus || previousStatus === reservation.status) return

          const copy = STATUS_COPY[reservation.status]
          if (!copy) return

          pushToast({
            id: `${reservation.id}-${reservation.status}-${Date.now()}`,
            title: copy.label,
            message: `${copy.message} (${getPackName(reservation)})`,
            icon: copy.icon,
          })
        })

        knownStatuses.current = nextStatuses
        initialized.current = true
      } catch {}
    }

    loadReservations()
    const interval = window.setInterval(loadReservations, 4000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [isAuthenticated])

  if (toasts.length === 0) return null

  return (
    <div className={styles.viewport} aria-live="polite" aria-atomic="true">
      {toasts.map(toast => (
        <div key={toast.id} className={styles.toast}>
          <div className={styles.icon}>{toast.icon}</div>
          <div>
            <div className={styles.title}>{toast.title}</div>
            <p className={styles.message}>{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
