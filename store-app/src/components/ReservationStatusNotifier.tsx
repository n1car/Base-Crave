import { useEffect, useRef, useState } from 'react'
import { reservationsAPI } from '../api/client'
import { Reservation } from '../types'
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
    label: 'New order received',
    message: 'A customer is waiting for you to accept this order.',
    icon: 'NEW',
  },
  in_process: {
    label: 'Order in progress',
    message: 'This order is now being prepared.',
    icon: 'GO',
  },
  ready: {
    label: 'Order ready',
    message: 'The customer can pick up this order now.',
    icon: 'OK',
  },
  picked_up: {
    label: 'Pickup completed',
    message: 'The order was verified and marked as picked up.',
    icon: 'DONE',
  },
  cancelled: {
    label: 'Order cancelled',
    message: 'This order is no longer active.',
    icon: '!',
  },
}

function getOrderName(reservation: Reservation) {
  if (reservation.packs?.pack_type === 'surprise') return 'Surprise Pack'
  return reservation.packs?.title || 'Pack'
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
        const { data } = await reservationsAPI.getStore()
        if (cancelled) return

        const nextStatuses = new Map<string, string>()
        data.forEach(reservation => {
          nextStatuses.set(reservation.id, reservation.status)
          const previousStatus = knownStatuses.current.get(reservation.id)
          const isNewOrder = initialized.current && !previousStatus && reservation.status === 'reserved'
          const changedStatus = initialized.current && previousStatus && previousStatus !== reservation.status

          if (!isNewOrder && !changedStatus) return

          const copy = STATUS_COPY[reservation.status]
          if (!copy) return

          pushToast({
            id: `${reservation.id}-${reservation.status}-${Date.now()}`,
            title: copy.label,
            message: `${copy.message} (${getOrderName(reservation)} #${reservation.id.slice(0, 4).toUpperCase()})`,
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
