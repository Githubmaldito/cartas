import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import useAuthStore from '../../store/authStore'
import useMessagesStore from '../../store/messagesStore'
import COLORS from '../../constants/colors'

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora mesmo'
  if (diffMins < 60) return `Há ${diffMins} min`
  if (diffHours < 24) return `Há ${diffHours}h`
  if (diffDays < 7) return `Há ${diffDays}d`
  return date.toLocaleDateString('pt-BR')
}

export default function Inbox() {
  const { token } = useAuthStore()
  const { messages, loading, fetchReceived, markAsRead } = useMessagesStore()
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true)
    await fetchReceived()
    if (refresh) setRefreshing(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchReceived(token)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [fetchReceived, token])

  const openMessage = async (item) => {
    if (!item.read) await markAsRead(item._id)
    router.push(`/message/${item._id}`)
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.unreadCard]}
      onPress={() => openMessage(item)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.from?.profileImage }} style={styles.avatar} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.username}>@{item.from?.username || 'desconhecido'}</Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.sealedEnvelope}>
          <Ionicons name="mail" size={42} color={COLORS.primary} />
          <Text style={styles.sealedText}>Toque para abrir</Text>
        </View>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )

  if (loading && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Cartas recebidas</Text>
            <Text style={styles.subtitle}>Os desenhos que chegaram até você</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-open-outline" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Nenhuma carta ainda</Text>
            <Text style={styles.emptySubtext}>
              Quando alguém te enviar um desenho, ele aparecerá aqui.
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#1a1a2e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background || '#1a1a2e' },
  listContent: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadCard: { borderColor: COLORS.primary, borderWidth: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  username: { fontWeight: '600', color: '#fff' },
  date: { fontSize: 12, color: COLORS.textSecondary },
  thumbnail: { width: '100%', height: 140, borderRadius: 8, backgroundColor: '#222' },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  sealedEnvelope: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#22223a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#33334d',
    borderStyle: 'dashed',
  },
  sealedText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
})