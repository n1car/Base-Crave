import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Start from './pages/Start'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Packs from './pages/Packs'
import PackDetailEdit from './pages/PackDetailEdit'
import DetailPack from './pages/DetailPack'
import DashboardFixedProduct from './pages/DashboardFixedProduct'
import DashboardSurpriseProduct from './pages/DashboardSurpriseProduct'
import OrderCompleted from './pages/OrderCompleted'
import ScanQRCode from './pages/ScanQRCode'
import Profile from './pages/Profile'
import Orders from './pages/Orders'
import OrdersInProgress from './pages/OrdersInProgress'
import OrdersReady from './pages/OrdersReady'

interface PrivateRouteProps {
  children: React.ReactNode
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/start" />
  }

  return <>{children}</>
}

function App() {
  const { checkAuth } = useAuthStore()

  React.useEffect(() => {
    checkAuth()
  }, [])

  return (
    <Routes>
      <Route path="/start" element={<Start />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/packs"
        element={
          <PrivateRoute>
            <Packs />
          </PrivateRoute>
        }
      />
      <Route
        path="/packs/:id/edit"
        element={
          <PrivateRoute>
            <PackDetailEdit />
          </PrivateRoute>
        }
      />
      <Route
        path="/packs/:id"
        element={
          <PrivateRoute>
            <DetailPack />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/fixed"
        element={
          <PrivateRoute>
            <DashboardFixedProduct />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/surprise"
        element={
          <PrivateRoute>
            <DashboardSurpriseProduct />
          </PrivateRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <PrivateRoute>
            <Orders />
          </PrivateRoute>
        }
      />
      <Route
        path="/orders/in-progress"
        element={
          <PrivateRoute>
            <OrdersInProgress />
          </PrivateRoute>
        }
      />
      <Route
        path="/orders/ready"
        element={
          <PrivateRoute>
            <OrdersReady />
          </PrivateRoute>
        }
      />
      <Route
        path="/order-completed"
        element={
          <PrivateRoute>
            <OrderCompleted />
          </PrivateRoute>
        }
      />
      <Route
        path="/scan-qr"
        element={
          <PrivateRoute>
            <ScanQRCode />
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
    </Routes>
  )
}

export default App
