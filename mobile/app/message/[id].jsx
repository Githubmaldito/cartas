import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import useAuthStore from '../../store/authStore'
import useMessagesStore from '../../store/messagesStore'

const { width } = Dimensions.get('window')

export default function MessageDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { token } = useAuthStore()
  const { messages } = useMessagesStore()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const flatListRef = useRef(null)

  useEffect(() => {
    // Busca na store já carregada; se não tiver, faz fetch
    const found = messages.find((m) => m._id === id)
    if (found) {
      setMessage(found)
      setLoading(false)
    } else {
      // fallback: busca direto (caso o app tenha recarregado)
      const fetchMessage = async () => {
        try {
          const res = await fetch(
            `${require('../../constants/api').API_URL}/messages?limit=100`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'Erro')
          const m = (data.messages || []).find((x) => x._id === id)
          if (!m) throw new Error('Mensagem não encontrada')
          setMessage(m)
        } catch (err) {
          Alert.alert('Erro', err.message)
          router.back()
        } finally {
          setLoading(false)
        }
      }
      fetchMessage()
    }
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

  const onScroll = (e) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width)
    setCurrentPage(page)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6c5ce7" />
      </View>
    )
  }

  const images = message.imageUrls || []

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

      {/* Carrossel de páginas */}
      <View style={styles.carouselWrapper}>
        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          renderItem={({ item }) => (
            <View style={styles.pageWrapper}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="contain"
              />
            </View>
          )}
        />
      </View>

      {/* Indicador de página */}
      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentPage && styles.dotActive]}
            />
          ))}
        </View>
      )}

      {images.length > 1 && (
        <Text style={styles.pageIndicator}>
          {currentPage + 1} / {images.length}
        </Text>
      )}
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
  carouselWrapper: { flex: 1, marginVertical: 8 },
  pageWrapper: {
    width,
    paddingHorizontal: 12,
  },
  image: { flex: 1, width: '100%' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  dotActive: { backgroundColor: '#6c5ce7' },
  pageIndicator: {
    color: '#999',
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 20,
  },
})