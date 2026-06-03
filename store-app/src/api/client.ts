import axios from 'axios'
import { UserRole, Reservation } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  role: UserRole
}

export interface AuthResponse {
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    created_at: string
  }
  token: string
}

export const authAPI = {
  login: (data: LoginData) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterData) => api.post<AuthResponse>('/auth/register', data),
  me: () => api.get('/auth/me'),
  uploadProfileImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/auth/upload-profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

export interface Store {
  id: string
  name: string
  description: string | null
  address: string
  latitude: number
  longitude: number
  is_open: boolean
  owner_id: string
  created_at: string
  packs?: Pack[]
}

export interface Pack {
  id: string
  store_id: string
  title: string
  description: string | null
  pack_type: string
  price: number
  original_price: number | null
  pickup_start: string
  pickup_end: string
  total_quantity: number
  remaining_quantity: number
  image_url?: string
  status: string
  created_at: string
  stores?: Store
}

export const storesAPI = {
  getMyStore: () => api.get<Store>('/stores/my/store'),
  toggleOpen: () => api.put<Store>('/stores/my/toggle'),
  create: (data: Partial<Store>) => api.post<Store>('/stores', data),
  update: (id: string, data: Partial<Store>) => api.put<Store>(`/stores/${id}`, data),
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/stores/my/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

export const packsAPI = {
  getByStore: () => api.get<Store>('/stores/my/store').then(res => res.data.packs || []),
  getOne: (id: string) => api.get<Pack>(`/packs/${id}`).then(res => res.data),
  create: (data: Partial<Pack>) => api.post<Pack>('/packs', data).then(res => res.data),
  update: (id: string, data: Partial<Pack>) => api.put<Pack>(`/packs/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/packs/${id}`),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post(`/packs/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

export const reservationsAPI = {
  getStore: () => api.get<Reservation[]>('/reservations/store'),
  updateStatus: (id: string, status: 'in_process' | 'ready') => api.patch<Reservation>(`/reservations/${id}/status`, { status }),
  verify: (id: string, pickup_code: string) => api.post(`/reservations/${id}/verify`, { pickup_code }),
  verifyByCode: (pickup_code: string) => api.post('/reservations/verify-code', { pickup_code }),
  reject: (id: string) => api.post(`/reservations/${id}/reject`),
}

export default api
