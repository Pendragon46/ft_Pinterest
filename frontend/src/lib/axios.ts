import axios from 'axios'
import type { AxiosInstance } from 'axios'

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Intercepteur de requête — emplacement prêt (ex. injecter le token d'auth).
// À implémenter plus tard.
api.interceptors.request.use((config) => config)

// Intercepteur de réponse — emplacement prêt (ex. gestion globale des erreurs).
// À implémenter plus tard.
api.interceptors.response.use((response) => response)
