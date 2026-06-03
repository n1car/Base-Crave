import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storesAPI, Store } from '../api/client'
import { getUserLocation } from '../lib/location'
import { calculateDistance, formatDistance } from '../lib/distance'
import styles from './SearchList.module.css'
import BottomNav from '../components/BottomNav'

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

const MapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "var(--primary)" : "none"} stroke={filled ? "var(--primary)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const LocationIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const BoxIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
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
      return `${h} ${ampm}`
    }
    return `${formatTime(start).replace(' AM', '').replace(' PM', '')}-${formatTime(end)}`
  } catch (e) {
    return ''
  }
}

const CATEGORIES = ['Meals', 'Coffee', 'Fast Food', 'Desserts', 'Healthy']

function getCategoryFromStore(store?: { description?: string | null } | null): string {
  if (!store?.description) return ''
  return CATEGORIES.includes(store.description) ? store.description : ''
}

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CO')}`
}

// function getTagForStore(storeName: string) {
//   const lower = storeName.toLowerCase()
//   if (lower.includes('crepes') || lower.includes('wok')) return 'Meals'
//   if (lower.includes('bakery') || lower.includes('postre')) return 'Desserts'
//   if (lower.includes('salad') || lower.includes('bowl')) return 'Healthy'
//   return 'Meals'
// }

export default function SearchList() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [favoritePackIds, setFavoritePackIds] = useState<string[]>([])

  useEffect(() => {
    getUserLocation().then(setUserLocation)
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      const { data } = await storesAPI.getAll()
      setStores(data)
      const favPackIds = JSON.parse(localStorage.getItem('favorite_pack_ids') || '[]')
      setFavoritePackIds(Array.isArray(favPackIds) ? favPackIds : [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (e: React.MouseEvent, packId: string) => {
    e.stopPropagation()
    const isFav = favoritePackIds.includes(packId)
    const next = isFav ? favoritePackIds.filter((id) => id !== packId) : [...favoritePackIds, packId]
    setFavoritePackIds(next)
    localStorage.setItem('favorite_pack_ids', JSON.stringify(next))
  }

  const filtered = stores.filter((store) => {
    return `${store.name} ${store.address} ${store.description || ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
  })

  const getImageUrl = (pack: any) => {
    if (pack?.image_url) return pack.image_url
    if (pack?.pack_type === 'surprise') {
      return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop'
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop'
  }

  return (
    <div className={styles.appContainer}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Explore</h1>
          <div className={styles.searchContainer}>
            <div className={styles.searchIconWrapper}>
              <SearchIcon />
            </div>
            <input
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants or food..."
            />
          </div>
          
          <div className={styles.controlsRow}>
            <div className={styles.toggleGroup}>
              <button className={`${styles.toggleBtn} ${styles.activeToggle}`}>
                <ListIcon />
                List
              </button>
              <button 
                className={styles.toggleBtn} 
                onClick={() => {
                  setTimeout(() => navigate('/search/map'), 300)
                }}
              >
                <MapIcon />
                Map
              </button>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <p className={styles.resultsCount}>{filtered.length} restaurants nearby</p>
          
          {loading ? (
            <p className={styles.loadingText}>Loading...</p>
          ) : (
            <div className={styles.storesList}>
              {filtered.map((store) => {
                const mainPack = store.packs?.[0]
                const hasPacks = !!mainPack
                const imageUrl = getImageUrl(mainPack)
                
                const isUnavailable = !store.is_open || !hasPacks || mainPack.remaining_quantity === 0 || mainPack.status === 'sold_out' || mainPack.status === 'expired'

                return (
                  <div
                    key={store.id}
                    className={`${styles.storeCard} ${isUnavailable ? styles.soldOutCard : ''}`}
                    onClick={() => !isUnavailable && navigate(`/product/${mainPack.id}`)}
                  >
                    <div className={styles.imageContainer}>
                      <img
                        src={imageUrl}
                        alt={store.name}
                        className={styles.storeImage}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop'
                        }}
                      />
                      <div className={styles.packTypeTag}>{mainPack?.pack_type === 'surprise' ? 'Surprise' : 'Fixed'}</div>
                      <div className={styles.tag}>{getCategoryFromStore(store)}</div>
                      <div className={styles.avatarWrapper}>
                        {store.image_url || store.users?.profile_image ? (
                          <img
                            src={store.image_url || store.users?.profile_image}
                            alt={store.name}
                            className={styles.storeAvatar}
                          />
                        ) : (
                          <div className={styles.storeAvatarFallback}>
                            {store.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {isUnavailable && (
                        <div className={styles.soldOutOverlay}>
                          <span className={styles.soldOutTitle}>No packs available</span>
                          <span className={styles.soldOutSub}>Check back tomorrow</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.cardContent}>
                      <div className={styles.cardHeader}>
                        <h3>{store.name}</h3>
                        <button className={styles.heartBtn} onClick={(e) => mainPack && toggleFavorite(e, mainPack.id)}>
                          <HeartIcon filled={mainPack ? favoritePackIds.includes(mainPack.id) : false} />
                        </button>
                      </div>
                      
                      {hasPacks && (
                        <div className={styles.pricing}>
                          <span className={styles.currentPrice}>{formatPrice(mainPack.price)}</span>
                        </div>
                      )}
                      
                      <div className={styles.metaRow}>
                        <div className={styles.metaItem}>
                          <LocationIcon />
                          <span>{userLocation && store?.latitude ? formatDistance(calculateDistance(userLocation.lat, userLocation.lng, store.latitude, store.longitude)) : ''}</span>
                        </div>
                        <div className={styles.divider}></div>
                        <div className={styles.metaItem}>
                          <BoxIcon />
                          <span>{hasPacks ? mainPack.remaining_quantity : 0} left</span>
                        </div>
                        <div className={styles.metaItemRight}>
                          <ClockIcon />
                          <span>{hasPacks ? formatTimeRange(mainPack.pickup_start, mainPack.pickup_end) : 'Closed'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <BottomNav active="search" />
      </div>
    </div>
  )
}
