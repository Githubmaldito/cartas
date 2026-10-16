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
    void load() //ignoera
  }, [fetchReceived, token])

  const openMessage = async (item) => {
    if (!item.read) await markAsRead(item._id)
    router.push(`/message/${item._id}`)
  }

  const renderItem = ({ item }) => {
    const isUnread = !item.read

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => openMessage(item)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: item.from?.profileImage }} style={styles.avatar} />

        <Text style={styles.username} numberOfLines={1}>
          @{item.from?.username || 'desconhecido'}
        </Text>

        <View style={styles.rightBlock}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <Ionicons
            name={isUnread ? 'mail' : 'mail-open-outline'}
            size={28}
            color={isUnread ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
      </TouchableOpacity>
    )
  }

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
            <Text style={styles.title}>Caixa de entrada</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-open-outline" size={80} color={COLORS.textSecondary} />
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
  title: { fontSize: 30, fontWeight: '800', color: COLORS.primary, marginBottom: 12, marginTop: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  unreadCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    flex: 1,
    fontWeight: '600',
    color: '#000000',
    fontSize: 20,
  },
  rightBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  date: {
    fontSize: 16,
    color: COLORS.textSecondary,
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