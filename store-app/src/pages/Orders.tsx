import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { reservationsAPI } from '../api/client'
import { Reservation } from '../types'
import BottomNav from '../components/BottomNav'
import styles from './Orders.module.css'

export default function Orders() {
  const navigate = useNavigate()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReservations()
    const interval = setInterval(loadReservations, 4000)
    return () => clearInterval(interval)
  }, [])

  const loadReservations = async () => {
    try {
      const { data } = await reservationsAPI.getStore()
      setReservations(data)
    } finally {
      setLoading(false)
    }
  }

  const pending = reservations.filter(r => r.status === 'reserved')

  const handleAccept = useCallback(async (id: string) => {
    try {
      await reservationsAPI.updateStatus(id, 'in_process')
      loadReservations()
    } catch {}
  }, [])

  const handleDecline = useCallback(async (id: string) => {
    try {
      await reservationsAPI.reject(id)
      loadReservations()
    } catch {}
  }, [])

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
          <button className={styles.acceptBtn} onClick={() => handleAccept(res.id)}>
            Accept
          </button>
          <button className={styles.declineBtn} onClick={() => handleDecline(res.id)}>
            Decline
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
          <div className={`${styles.filterBtn} ${styles.filterBtnActive}`}>
            <span>Pending</span>
          </div>
          <div className={styles.filterBtn} onClick={() => navigate('/orders/in-progress')}>
            <span>In Progress</span>
          </div>
          <div className={styles.filterBtn} onClick={() => navigate('/orders/ready')}>
            <span>Ready</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : pending.length === 0 ? (
        <div className={styles.empty}>
          <p>No pending orders</p>
        </div>
      ) : (
        <div className={styles.cardsContainer}>
          {pending.map(res => renderOrderCard(res))}
        </div>
      )}

      <div style={{ height: '60px' }} />
      <BottomNav active="orders" />
    </div>
  )
}
