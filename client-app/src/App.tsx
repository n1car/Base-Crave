import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Start from './pages/Start'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import Home from './pages/Home'
import SearchList from './pages/SearchList'
import SearchMap from './pages/SearchMap'
import DetailProduct from './pages/DetailProduct'
import ReserveProduct from './pages/ReserveProduct'
import ReserveProductDetailFornProfile from './pages/ReserveProductDetailFornProfile'
import Favorites from './pages/Favorites'
import Profile from './pages/Profile'
import ViewQRCode from './pages/ViewQRCode'
import ReservationDetail from './pages/ReservationDetail'
import ReservationStatusNotifier from './components/ReservationStatusNotifier'

interface PrivateRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#101010',
        gap: '24px',
      }}>
        <img src="/images/Logo-home.png" alt="Crave" style={{ width: 64, height: 64, opacity: 0.9 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#f95519',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/start" />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}

function App() {
  const { checkAuth } = useAuthStore()

  React.useEffect(() => {
    checkAuth()
  }, [])

  return (
    <>
      <ReservationStatusNotifier />
      <Routes>
      <Route path="/start" element={<Start />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/search/list"
        element={
          <PrivateRoute>
            <SearchList />
          </PrivateRoute>
        }
      />
      <Route
        path="/search/map"
        element={
          <PrivateRoute>
            <SearchMap />
          </PrivateRoute>
        }
      />
      <Route
        path="/product/:id"
        element={
          <PrivateRoute>
            <DetailProduct />
          </PrivateRoute>
        }
      />
      <Route
        path="/reserve/:id"
        element={
          <PrivateRoute>
            <ReserveProduct />
          </PrivateRoute>
        }
      />
      <Route
        path="/reserve/detail/:id"
        element={
          <PrivateRoute>
            <ReserveProductDetailFornProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <PrivateRoute>
            <Favorites />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/qr/:id"
        element={
          <PrivateRoute>
            <ViewQRCode />
          </PrivateRoute>
        }
      />
      <Route
        path="/reservation/:id"
        element={
          <PrivateRoute>
            <ReservationDetail />
          </PrivateRoute>
        }
      />
      </Routes>
    </>
  )
}

export default App
