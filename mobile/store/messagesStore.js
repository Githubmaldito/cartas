import { create } from 'zustand'
import { API_URL } from '../constants/api'

const useMessagesStore = create((set, get) => ({
  messages: [],
  sentMessages: [],
  loading: false,

  fetchReceived: async (token) => {
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

  fetchSent: async (token) => {
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

  // sendMessage: async (token, to, imagesBase64) => {
  //   console.log('[sendMessage] imagens:', imagesBase64.length, 'primeira:', imagesBase64[0]?.slice(0, 60))
  //   const res = await fetch(`${API_URL}/messages`, {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({ to, images: imagesBase64 }),
  //   });
  //   const data = await res.json();
  //   if (!res.ok) throw new Error(data.message || 'Falha ao enviar');
  //   return data;
  // },

  sendMessage: async (token, to, imagesBase64) => {
    console.log('[messagesStore] sendMessage chamado. to:', to, 'imagens:', imagesBase64.length)
    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, images: imagesBase64 }),
    })
    console.log('[messagesStore] resposta status:', res.status)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Falha ao enviar')
    return data
  },

  markAsRead: async (token, messageId) => {
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