import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { reservationsAPI, Reservation, authAPI } from '../api/client'
import styles from './Profile.module.css'
import BottomNav from '../components/BottomNav'

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
)

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
)

const BoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F95519" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
)

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CO')}`
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuthStore()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadReservations()
    const interval = setInterval(loadReservations, 4000)
    return () => clearInterval(interval)
  }, [])

  const loadReservations = async () => {
    try {
      const { data } = await reservationsAPI.getMy()
      setReservations(data)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploading(true)
      try {
        const { data } = await authAPI.uploadProfileImage(file)
        if (data.user) {
          setUser(data.user)
        }
      } catch (error) {
        console.error('Error uploading image:', error)
      } finally {
        setUploading(false)
      }
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/start')
  }

  const todayReservations = reservations.filter((res: Reservation) =>
    isToday(res.created_at)
  )

  const resCount = todayReservations.length
  let favPackIds: string[] = []
  try { favPackIds = JSON.parse(localStorage.getItem('favorite_pack_ids') || '[]') } catch {}
  const favsCount = favPackIds.length
  const totalSaved = reservations
    .filter(r => r.status === 'picked_up')
    .reduce((acc, r) => acc + (r.packs?.price || 0) * r.quantity, 0)
  const savedAmount = totalSaved >= 1000 ? `$${(totalSaved / 1000).toFixed(0)}k` : `$${totalSaved.toLocaleString('es-CO')}`

  const displayReservations = todayReservations.length > 0 ? todayReservations : []

  return (
    <div className={styles.appContainer}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Profile</h1>
        </header>

        <div className={styles.content}>
          
          <div className={styles.profileCard}>
            <div className={styles.profileTop}>
              <div className={styles.avatarWrapper} onClick={!uploading ? handleAvatarClick : undefined} style={{ cursor: uploading ? 'default' : 'pointer' }}>
                {uploading ? (
                  <div className={styles.avatarFallback} style={{ background: '#333', fontSize: '10px' }}>...</div>
                ) : user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user?.name || 'Profile'}
                    className={styles.avatarImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) parent.classList.add(styles.avatarFallback);
                    }}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {(user?.name || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.profileInfo}>
                <h2>{user?.name || 'Sarah Hinestroza'}</h2>
                <div className={styles.infoRow}>
                  <MailIcon />
                  <span>{user?.email || 'sarah.Hines@gmail.com'}</span>
                </div>
                <div className={styles.infoRow}>
                  <PinIcon />
                  <span>Cali, Colombia</span>
                </div>
              </div>
            </div>
            
            <div className={styles.divider}></div>
            
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{resCount}</span>
                <span className={styles.statLabel}>Reservations</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{favsCount}</span>
                <span className={styles.statLabel}>Favorites</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{savedAmount}</span>
                <span className={styles.statLabel}>Saved</span>
              </div>
            </div>
          </div>

          <div className={styles.sectionHeader}>
            <div className={styles.iconCircle}>
              <BoxIcon />
            </div>
            <h3>Recent Reservations</h3>
          </div>

          <div className={styles.reservationsList}>
            {loading && reservations.length === 0 ? (
              <p className={styles.loadingText}>Loading...</p>
            ) : (
              displayReservations.map((res, index) => (
                <div key={res.id || index} className={styles.resCard} onClick={() => navigate(`/reservation/${res.id}`)}>
                  <div className={styles.resLeft}>
                    <h4>{res.packs?.stores?.name || 'Store'}</h4>
                    <p>{formatDate(res.packs?.pickup_start)}</p>
                  </div>
                  <div className={styles.resRight}>
                    <span className={styles.resPrice}>{formatPrice(res.packs?.price || 15000)}</span>
                    <span className={styles[`status_${res.status}`]}>
                      {res.status === 'reserved' ? 'Pending' : 
                       res.status === 'in_process' ? 'In Progress' : 
                       res.status === 'ready' ? 'Ready' : 
                       res.status === 'picked_up' ? 'Completed' : 
                       res.status.charAt(0).toUpperCase() + res.status.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronRightIcon />
                </div>
              ))
            )}
          </div>

          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} style={{ display: 'none' }} />

          <button onClick={handleLogout} className={styles.logoutButton}>
            Log Out
          </button>
          <div style={{ height: '40px' }} />
        </div>
        <BottomNav active="profile" />
      </div>
    </div>
  )
}
