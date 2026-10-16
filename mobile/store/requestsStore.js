import { create } from 'zustand'
import { API_URL } from '../constants/api'
import useAuthStore from './authStore'

const getToken = () => useAuthStore.getState().token

const useRequestsStore = create((set, get) => ({
  incoming: [],
  outgoing: [],

  fetchIncoming: async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/users/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Falha ao buscar convites')
      set({ incoming: data })
    } catch (err) {
      console.error('fetchIncoming error:', err)
    }
  },

  fetchOutgoing: async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/users/requests/sent`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Falha ao buscar enviados')
      set({ outgoing: data })
    } catch (err) {
      console.error('fetchOutgoing error:', err)
    }
  },

  sendRequest: async (toUserId) => {
    const token = getToken()
    if (!token) throw new Error('Sessão expirada.')
    const res = await fetch(`${API_URL}/users/requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: toUserId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Falha ao enviar convite')
    await get().fetchOutgoing()
    return data
  },

  acceptRequest: async (requestId) => {
    const token = getToken()
    if (!token) throw new Error('Sessão expirada.')
    const res = await fetch(`${API_URL}/users/requests/${requestId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Falha ao aceitar')
    set({ incoming: get().incoming.filter(r => r._id !== requestId) })
    return data
  },

  rejectRequest: async (requestId) => {
    const token = getToken()
    if (!token) throw new Error('Sessão expirada.')
    const res = await fetch(`${API_URL}/users/requests/${requestId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Falha ao rejeitar')
    set({ incoming: get().incoming.filter(r => r._id !== requestId) })
    return data
  },

  cancelRequest: async (requestId) => {
    const token = getToken()
    if (!token) throw new Error('Sessão expirada.')
    const res = await fetch(`${API_URL}/users/requests/${requestId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Falha ao cancelar')
    }
    set({ outgoing: get().outgoing.filter(r => r._id !== requestId) })
  },
}))

export default useRequestsStore