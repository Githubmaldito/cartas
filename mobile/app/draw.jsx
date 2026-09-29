import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import ViewShot from 'react-native-view-shot'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import * as FileSystem from 'expo-file-system/legacy'
import useAuthStore from '../store/authStore'
import useContactsStore from '../store/contactsStore'
import useMessagesStore from '../store/messagesStore'
import COLORS from '../constants/colors'

export default function Draw() {
  const router = useRouter()
  const { token } = useAuthStore()
  const { contacts, fetchContacts } = useContactsStore()
  const { sendMessage } = useMessagesStore()

  // pages[i] = array de paths da página i
  const [pages, setPages] = useState([[]])
  const [currentPage, setCurrentPage] = useState(0)
  const [currentPath, setCurrentPath] = useState('')
  const [sending, setSending] = useState(false)
  const [showContacts, setShowContacts] = useState(false)

  const shotRef = useRef(null)
  const isDrawing = useRef(false)

  useEffect(() => {
    fetchContacts(token)
  }, [])

  const onTouchStart = (e) => {
    isDrawing.current = true
    const { locationX, locationY } = e.nativeEvent
    setCurrentPath(`M${locationX},${locationY}`)
  }

  const onTouchMove = (e) => {
    if (!isDrawing.current) return
    const { locationX, locationY } = e.nativeEvent
    setCurrentPath((prev) => `${prev} L${locationX},${locationY}`)
  }

  const onTouchEnd = () => {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (currentPath) {
      setPages((prev) => {
        const next = [...prev]
        next[currentPage] = [...next[currentPage], currentPath]
        return next
      })
      setCurrentPath('')
    }
  }

  const undoLast = () => {
    setPages((prev) => {
      const next = [...prev]
      next[currentPage] = next[currentPage].slice(0, -1)
      return next
    })
  }

  const clearPage = () => {
    setPages((prev) => {
      const next = [...prev]
      next[currentPage] = []
      return next
    })
  }

  const addPage = () => {
    // Se o usuário está no meio de um traço, commit antes
    if (currentPath) {
      setPages((prev) => {
        const next = [...prev]
        next[currentPage] = [...next[currentPage], currentPath]
        return next
      })
      setCurrentPath('')
    }
    setPages((prev) => [...prev, []])
    setCurrentPage(pages.length)
  }

  const removePage = () => {
    if (pages.length === 1) {
      Alert.alert('Ops', 'Você precisa ter pelo menos uma página.')
      return
    }
    Alert.alert('Remover página', `Remover a página ${currentPage + 1}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          setPages((prev) => prev.filter((_, i) => i !== currentPage))
          setCurrentPage((p) => Math.max(0, p - 1))
        },
      },
    ])
  }

  const goPrev = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1)
  }
  const goNext = () => {
    if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1)
  }

  const isCurrentPageEmpty =
    pages[currentPage].length === 0 && currentPath === ''
  const hasAnyDrawing = pages.some((p) => p.length > 0)

  const handleSend = () => {
    if (!hasAnyDrawing) {
      Alert.alert('Ops', 'Você ainda não desenhou nada.')
      return
    }
    if (contacts.length === 0) {
      Alert.alert('Sem contatos', 'Adicione um contato na aba Perfil antes de enviar.')
      return
    }
    setShowContacts(true)
  }

  // Captura cada página e envia
  const sendTo = async (contact) => {
    setShowContacts(false)
    setSending(true)
    const originalPage = currentPage

    try {
      const capturedImages = []

      for (let i = 0; i < pages.length; i++) {
        setCurrentPage(i)
        // Espera o React re-renderizar o SVG da página i
        await new Promise((resolve) => setTimeout(resolve, 400))

        const uri = await shotRef.current.capture()
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        })
        capturedImages.push(`data:image/png;base64,${base64}`)
      }

      setCurrentPage(originalPage)

      await sendMessage(token, contact._id, capturedImages)

      Alert.alert('Enviado!', `Sua carta foi enviada para @${contact.username}.`)
      router.replace('/(tabs)')
    } catch (err) {
      console.error('sendTo error:', err)
      Alert.alert('Erro', err.message || 'Não foi possível enviar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova carta</Text>
        <TouchableOpacity onPress={removePage} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Barra de páginas */}
      <View style={styles.pageBar}>
        <TouchableOpacity
          onPress={goPrev}
          disabled={currentPage === 0}
          style={[styles.pageNavBtn, currentPage === 0 && styles.pageNavDisabled]}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageIndicator}>
          Página {currentPage + 1} / {pages.length}
        </Text>
        <TouchableOpacity
          onPress={goNext}
          disabled={currentPage === pages.length - 1}
          style={[
            styles.pageNavBtn,
            currentPage === pages.length - 1 && styles.pageNavDisabled,
          ]}
        >
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Área de desenho */}
      <ViewShot
        ref={shotRef}
        options={{
          format: 'png',
          quality: 1,
          renderToHardwareTextureAndroid: true,
        }}
        style={styles.canvasWrapper}
      >
        <View
          style={styles.canvas}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onTouchStart}
          onResponderMove={onTouchMove}
          onResponderRelease={onTouchEnd}
        >
          <Svg style={StyleSheet.absoluteFill}>
            {pages[currentPage].map((p, i) => (
              <Path
                key={i}
                d={p}
                stroke="#1a1a2e"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke="#1a1a2e"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>
      </ViewShot>

      {/* Barra de ferramentas */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={undoLast}>
          <Ionicons name="arrow-undo-outline" size={22} color="#fff" />
          <Text style={styles.toolText}>Desfazer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={clearPage}>
          <Ionicons name="brush-outline" size={22} color="#fff" />
          <Text style={styles.toolText}>Limpar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={addPage}>
          <Ionicons name="add-outline" size={22} color="#fff" />
          <Text style={styles.toolText}>Página</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, styles.sendBtn]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={22} color="#fff" />
              <Text style={styles.toolText}>Enviar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de escolha do contato */}
      <Modal
        visible={showContacts}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContacts(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enviar para...</Text>
            <FlatList
              data={contacts}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => sendTo(item)}
                >
                  <Image
                    source={{ uri: item.profileImage }}
                    style={styles.avatar}
                  />
                  <Text style={styles.contactName}>@{item.username}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#888" />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowContacts(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  pageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 6,
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a274a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNavDisabled: { opacity: 0.3 },
  pageIndicator: { color: '#fff', fontSize: 14, fontWeight: '600' },
  canvasWrapper: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f0',
  },
  canvas: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingBottom: 30,
    gap: 6,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#2a274a',
  },
  sendBtn: { backgroundColor: COLORS.primary },
  toolText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f1f38',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  contactName: { flex: 1, color: '#fff', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  cancelText: { color: '#aaa', fontSize: 15 },
})