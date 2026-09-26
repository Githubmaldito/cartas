import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import useAuthStore from '../../store/authStore'
import { API_URL } from '../../constants/api'

export default function MessageDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { token } = useAuthStore()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        // Como não criamos uma rota GET /messages/:id, vamos usar a lista geral
        // e filtrar pelo id. Alternativa: criar essa rota no backend.
        const res = await fetch(`${API_URL}/messages?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Erro ao buscar')
        const found = (data.messages || []).find((m) => m._id === id)
        if (!found) throw new Error('Mensagem não encontrada')
        setMessage(found)
      } catch (err) {
        Alert.alert('Erro', err.message)
        router.back()
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchMessage()
  }, [id])

  const formatDate = (dateString) => {
    const d = new Date(dateString)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6c5ce7" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carta</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.meta}>
        <Image
          source={{ uri: message.from?.profileImage }}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>@{message.from?.username}</Text>
          <Text style={styles.date}>{formatDate(message.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: message.imageUrl }}
          style={styles.image}
          contentFit="contain"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  username: { color: '#fff', fontSize: 16, fontWeight: '600' },
  date: { color: '#999', fontSize: 13, marginTop: 2 },
  imageWrapper: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    backgroundColor: '#f5f5f0',
    overflow: 'hidden',
  },
  image: { flex: 1, width: '100%' },
})