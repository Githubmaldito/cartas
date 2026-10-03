import { create } from 'zustand'
import { API_URL } from '../constants/api'
import useAuthStore from './authStore'

// Sempre pega o token atual do authStore
const getToken = () => useAuthStore.getState().token

const useMessagesStore = create((set, get) => ({
  messages: [],
  sentMessages: [],
  loading: false,

  fetchReceived: async () => {
    const token = getToken()
    console.log('[messagesStore] fetchReceived token?', !!token, 'len:', token?.length)

    if (!token) {
      console.warn('[messagesStore] fetchReceived sem token, abortando')
      set({ loading: false })
      return
    }

    set({ loading: true })
    try {
      const res = await fetch(`${API_URL}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Falha ao buscar mensagens')
      set({ messages: data.messages || [] })
    } catch (err) {
      console.error('fetchReceived error:', err)
    } finally {
      set({ loading: false })
    }
  },

  fetchSent: async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/messages/sent`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Falha ao buscar enviadas')
      set({ sentMessages: data })
    } catch (err) {
      console.error('fetchSent error:', err)
    }
  },

  sendMessage: async (to, imagesBase64) => {
    const token = getToken()
    console.log('[messagesStore] sendMessage token?', !!token, 'len:', token?.length)

    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, images: imagesBase64 }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Falha ao enviar')
    return data
  },

  markAsRead: async (messageId) => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${API_URL}/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, read: true } : m
        ),
      })
    } catch (err) {
      console.error('markAsRead error:', err)
    }
  },
}))

export default useMessagesStore