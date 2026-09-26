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
import useAuthStore from '../../store/authStore'
import useContactsStore from '../../store/contactsStore'
import COLORS from '../../constants/colors'

const Perfil = () => {
  const { token } = useAuthStore()
  const {
    contacts,
    loading,
    fetchContacts,
    findUser,
    addContact,
    removeContact,
  } = useContactsStore()
  const [searchCode, setSearchCode] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchContacts(token)
  }, [])

  const handleSearch = async () => {
    const code = searchCode.trim()
    if (!code) return
    setSearching(true)
    try {
      const user = await findUser(token, code)
      Alert.alert(
        'Adicionar contato?',
        `Deseja adicionar @${user.username}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Adicionar',
            onPress: async () => {
              try {
                await addContact(token, user._id)
                setSearchCode('')
                Alert.alert('Pronto!', `@${user.username} foi adicionado.`)
              } catch (err) {
                Alert.alert('Erro', err.message)
              }
            },
          },
        ]
      )
    } catch (err) {
      Alert.alert('Não encontrado', err.message)
    } finally {
      setSearching(false)
    }
  }

  const confirmRemove = (contact) => {
    Alert.alert('Remover contato', `Remover @${contact.username}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => removeContact(token, contact._id),
      },
    ])
  }

  const renderContact = ({ item }) => (
    <View style={styles.contactItem}>
      <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      <Text style={styles.contactName}>@{item.username}</Text>
      <TouchableOpacity onPress={() => confirmRemove(item)}>
        <Ionicons name="close-circle-outline" size={22} color={COLORS.textSecondary} />
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
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Ionicons name="search" size={20} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Seus contatos</Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
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
  section: { marginVertical: 12 },
  sectionTitle: {
    fontSize: 16,
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
    color: '#fff',
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
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  contactName: { flex: 1, color: '#fff', fontWeight: '500' },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
})