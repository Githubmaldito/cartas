import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Image as RNImage,
  useWindowDimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image as ExpoImage } from 'expo-image'
import useAuthStore from '../../store/authStore'
import useMessagesStore from '../../store/messagesStore'
import { API_URL } from '../../constants/api'

export default function MessageDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { token } = useAuthStore()
  const { messages } = useMessagesStore()
  const { width } = useWindowDimensions()

  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(() => !!id && !!token)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const found = messages.find((m) => m._id === id)
        if (found) {
          if (!cancelled) {
            setMessage(found)
            setLoading(false)
          }
          return
        }

        const res = await fetch(`${API_URL}/messages?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Erro ao buscar')

        const m = (data.messages || []).find((x) => x._id === id)
        if (!m) throw new Error('Mensagem não encontrada')

        if (!cancelled) {
          setMessage(m)
          setLoading(false)
        }
      } catch (err) {
        console.error('[MessageDetail] erro:', err)
        if (!cancelled) {
          Alert.alert('Erro', err.message)
          setLoading(false)
        }
      }
    }

    if (!id || !token) return
    load()

    return () => { cancelled = true }
  }, [id, token])

  const formatDate = (dateString) => {
    if (!dateString) return ''
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
        <Text style={styles.loadingText}>Carregando carta...</Text>
      </View>
    )
  }

  if (!message) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={60} color="#666" />
        <Text style={styles.loadingText}>Carta não encontrada</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const images = (() => {
    const raw =
      Array.isArray(message.imageUrls) && message.imageUrls.length > 0
        ? message.imageUrls
        : message.imageUrl
          ? [message.imageUrl]
          : []

    // Achata arrays aninhados ([[a],[b]] → [a,b]) e remove não-strings
    const flat = raw.flat(Infinity)
    return flat.filter((u) => typeof u === 'string' && u.length > 0)
  })()
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
        <ExpoImage
          source={{ uri: message.from?.profileImage }}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>@{message.from?.username || 'desconhecido'}</Text>
          <Text style={styles.date}>{formatDate(message.createdAt)}</Text>
        </View>
      </View>

      {images.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="image-outline" size={60} color="#666" />
          <Text style={styles.loadingText}>Nenhuma imagem nesta carta</Text>
        </View>
      ) : (
        <>
          <View style={styles.carouselWrapper}>
            <FlatList
              data={images}
              keyExtractor={(item, i) => `${i}-${item.slice(-8)}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScroll}
              renderItem={({ item }) => {
                if (typeof item !== 'string') {
                  console.warn('[MessageDetail] item inválido:', item)
                  return <View style={{ width }} />
                }
                return (
                  <View style={{ width, height: '100%', padding: 12 }}>
                    <RNImage
                      source={{ uri: item }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>
                )
              }}
            />
          </View>

          {images.length > 1 && (
            <>
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === currentPage && styles.dotActive]}
                  />
                ))}
              </View>
              <Text style={styles.pageIndicator}>
                {currentPage + 1} / {images.length}
              </Text>
            </>
          )}
        </>
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
    gap: 12,
  },
  loadingText: { color: '#aaa', fontSize: 14 },
  backBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#6c5ce7',
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
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
  carouselWrapper: { flex: 1 },
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