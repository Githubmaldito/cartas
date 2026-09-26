import { create } from 'zustand'
import { API_URL } from '../constants/api'

const useContactsStore = create((set, get) => ({
  contacts: [],
  loading: false,

  fetchContacts: async (token) => {
    set({ loading: true })
    try {
      const res = await fetch(`${API_URL}/users/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Falha ao buscar contatos')
      set({ contacts: data })
    } catch (err) {
      console.error('fetchContacts error:', err)
    } finally {
      set({ loading: false })
    }
  },

  findUser: async (token, code) => {
    const res = await fetch(
      `${API_URL}/users/find?code=${encodeURIComponent(code)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Usuário não encontrado')
    return data
  },

  addContact: async (token, contactId) => {
    const res = await fetch(`${API_URL}/users/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Falha ao adicionar')
    await get().fetchContacts(token)
    return data
  },

  removeContact: async (token, contactId) => {
    const res = await fetch(`${API_URL}/users/contacts/${contactId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Falha ao remover')
    }
    set({ contacts: get().contacts.filter((c) => c._id !== contactId) })
  },
}))

export default useContactsStore