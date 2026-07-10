import axios from 'axios'
import type { AxiosInstance } from 'axios'

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Placeholder request interceptor (e.g. inject auth token).
api.interceptors.request.use((config) => config)

// Placeholder response interceptor (e.g. global error handling).
api.interceptors.response.use((response) => response)
