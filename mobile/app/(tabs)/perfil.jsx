import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import Header from '../components/Header'
import Logout from '../components/Logout'
import useContactsStore from '../../store/contactsStore'
import useRequestsStore from '../../store/requestsStore'
import COLORS from '../../constants/colors'

const Perfil = () => {
  const {
    contacts,
    loading: loadingContacts,
    fetchContacts,
    findUser,
    removeContact,
  } = useContactsStore()
  const {
    incoming,
    outgoing,
    fetchIncoming,
    fetchOutgoing,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
  } = useRequestsStore()

  const [searchCode, setSearchCode] = useState('')
  const [searching, setSearching] = useState(false)
  const [foundUser, setFoundUser] = useState(null)

  useEffect(() => {
    fetchContacts()
    fetchIncoming()
    fetchOutgoing()
  }, [])

  const handleSearch = async () => {
    const code = searchCode.trim()
    if (!code) return
    setSearching(true)
    setFoundUser(null)
    try {
      const user = await findUser(code)
      setFoundUser(user)
    } catch (err) {
      Alert.alert('Não encontrado', err.message)
    } finally {
      setSearching(false)
    }
  }

  const handleSendRequest = async () => {
    if (!foundUser) return
    try {
      const result = await sendRequest(foundUser._id)
      if (result?.autoAccepted) {
        Alert.alert('Pronto!', `Você e @${foundUser.username} agora são contatos.`)
        await fetchContacts()
      } else {
        Alert.alert('Convite enviado', `Aguardando @${foundUser.username} aceitar.`)
      }
      setFoundUser(null)
      setSearchCode('')
      await fetchOutgoing()
    } catch (err) {
      Alert.alert('Erro', err.message)
    }
  }

  const handleAccept = async (request) => {
    try {
      await acceptRequest(request._id)
      await fetchContacts()
      Alert.alert('Aceito!', `@${request.from.username} agora é seu contato.`)
    } catch (err) {
      Alert.alert('Erro', err.message)
    }
  }

  const handleReject = (request) => {
    Alert.alert('Rejeitar convite', `Rejeitar convite de @${request.from.username}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rejeitar',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectRequest(request._id)
          } catch (err) {
            Alert.alert('Erro', err.message)
          }
        },
      },
    ])
  }

  const handleCancel = (request) => {
    Alert.alert('Cancelar convite', `Cancelar convite para @${request.to.username}?`, [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelRequest(request._id)
          } catch (err) {
            Alert.alert('Erro', err.message)
          }
        },
      },
    ])
  }

  const confirmRemove = (contact) => {
    Alert.alert('Remover contato', `Remover @${contact.username}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => removeContact(contact._id),
      },
    ])
  }

  const renderFoundUser = () => {
    if (!foundUser) return null

    const rel = foundUser.relationship
    let label = 'Enviar convite'
    let disabled = false
    let onPress = handleSendRequest

    if (rel === 'contact') {
      label = 'Já é seu contato'
      disabled = true
    } else if (rel === 'pending-out') {
      label = 'Convite já enviado'
      disabled = true
    } else if (rel === 'pending-in') {
      label = 'Convite pendente abaixo'
      disabled = true
    }

    return (
      <View style={styles.foundCard}>
        <Image source={{ uri: foundUser.profileImage }} style={styles.avatar} />
        <Text style={styles.foundName}>@{foundUser.username}</Text>
        <TouchableOpacity
          style={[styles.foundBtn, disabled && styles.foundBtnDisabled]}
          onPress={onPress}
          disabled={disabled}
        >
          <Text style={styles.foundBtnText}>{label}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderContact = ({ item }) => (
    <View style={styles.contactItem}>
      <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      <Text style={styles.contactName}>@{item.username}</Text>
      <TouchableOpacity onPress={() => confirmRemove(item)}>
        <Ionicons name="close-circle-outline" size={32} color={COLORS.textSecondary} marginHorizontal={6} />
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item._id}
        renderItem={renderContact}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Header />
            <Logout />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adicionar contato</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Digite o username"
                  placeholderTextColor={COLORS.placeholderTextColor}
                  value={searchCode}
                  onChangeText={setSearchCode}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : (
                    <Ionicons name="search" size={20} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
              {renderFoundUser()}
            </View>

            {incoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Convites recebidos ({incoming.length})
                </Text>
                {incoming.map((item) => (
                  <View key={item._id} style={styles.requestItem}>
                    <Image source={{ uri: item.from.profileImage }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>@{item.from.username}</Text>
                      <Text style={styles.requestSub}>quer ser seu contato</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(item)}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(item)}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {outgoing.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Convites enviados ({outgoing.length})
                </Text>
                {outgoing.map((item) => (
                  <View key={item._id} style={styles.requestItem}>
                    <Image source={{ uri: item.to.profileImage }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>@{item.to.username}</Text>
                      <Text style={styles.requestSub}>convite pendente</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.cancelRequestBtn}
                      onPress={() => handleCancel(item)}
                    >
                      <Ionicons name="close" size={18} color="#aaa" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Seus contatos</Text>
          </>
        }
        ListEmptyComponent={
          loadingContacts ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.emptyText}>Você ainda não tem contatos.</Text>
          )
        }
      />
    </View>
  )
}

export default Perfil

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#1a1a2e' },
  list: { padding: 16, paddingBottom: 100 },
  section: { marginVertical: 14 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#301212',
    height: 46,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  foundName: { flex: 1, color: '#301212', fontWeight: '500' },
  foundBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  foundBtnDisabled: { opacity: 0.5 },
  foundBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  requestSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a9d8f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e63946',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelRequestBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0e01a5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 20,

  },
  contactName: {
    flex: 1,
    color: '#301717',
    fontWeight: '500',
    fontSize: 16,
    marginHorizontal: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
})