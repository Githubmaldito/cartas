import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import Svg, { Path, Text as SvgText, TSpan } from 'react-native-svg'
import ViewShot from 'react-native-view-shot'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import * as FileSystem from 'expo-file-system/legacy'
import useAuthStore from '../store/authStore'
import useContactsStore from '../store/contactsStore'
import useMessagesStore from '../store/messagesStore'
import COLORS from '../constants/colors'

const FONT_FAMILY = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: 'monospace',
})

const FONT_SIZES = [
  { label: 'P', value: 14 },
  { label: 'M', value: 18 },
  { label: 'G', value: 24 },
]

export default function Draw() {
  const router = useRouter()
  const { contacts, fetchContacts } = useContactsStore()
  const { sendMessage } = useMessagesStore()

  // pages[i] = array de itens { type: 'path' | 'text', ... }
  const [pages, setPages] = useState([[]])
  const [currentPage, setCurrentPage] = useState(0)
  const [currentPath, setCurrentPath] = useState('')
  const [mode, setMode] = useState('draw') // 'draw' | 'text'
  const [fontSize, setFontSize] = useState(18)

  // Modal de texto
  const [showTextModal, setShowTextModal] = useState(false)
  const [textDraft, setTextDraft] = useState({ x: 0, y: 0 })
  const [textValue, setTextValue] = useState('')

  const [sending, setSending] = useState(false)
  const [showContacts, setShowContacts] = useState(false)

  const shotRef = useRef(null)
  const isDrawing = useRef(false)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchContacts()
  }, [])

  // ---------- Toque na tela ----------
  const onTouchStart = (e) => {
    const { locationX, locationY } = e.nativeEvent

    if (mode === 'text') {
      setTextDraft({ x: locationX, y: locationY })
      setTextValue('')
      setShowTextModal(true)
      setTimeout(() => inputRef.current?.focus(), 150)
      return
    }

    isDrawing.current = true
    setCurrentPath(`M${locationX},${locationY}`)
  }

  const onTouchMove = (e) => {
    if (mode === 'text') return
    if (!isDrawing.current) return
    const { locationX, locationY } = e.nativeEvent
    setCurrentPath((prev) => `${prev} L${locationX},${locationY}`)
  }

  const onTouchEnd = () => {
    if (mode === 'text') return
    if (!isDrawing.current) return
    isDrawing.current = false
    if (currentPath) {
      setPages((prev) => {
        const next = [...prev]
        next[currentPage] = [...next[currentPage], { type: 'path', d: currentPath }]
        return next
      })
      setCurrentPath('')
    }
  }

  // ---------- Ações do toolbar ----------
  const undoLast = () => {
    setPages((prev) => {
      const next = [...prev]
      next[currentPage] = next[currentPage].slice(0, -1)
      return next
    })
  }

  const clearPage = () => {
    Alert.alert('Limpar página', `Apagar tudo da página ${currentPage + 1}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: () =>
          setPages((prev) => {
            const next = [...prev]
            next[currentPage] = []
            return next
          }),
      },
    ])
  }

  const addPage = () => {
    if (currentPath) {
      setPages((prev) => {
        const next = [...prev]
        next[currentPage] = [...next[currentPage], { type: 'path', d: currentPath }]
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

  const goPrev = () => currentPage > 0 && setCurrentPage(currentPage - 1)
  const goNext = () =>
    currentPage < pages.length - 1 && setCurrentPage(currentPage + 1)

  // ---------- Modal de texto ----------
  const confirmText = () => {
    const content = textValue.trim()
    if (!content) {
      setShowTextModal(false)
      return
    }
    setPages((prev) => {
      const next = [...prev]
      next[currentPage] = [
        ...next[currentPage],
        {
          type: 'text',
          x: textDraft.x,
          y: textDraft.y,
          content,
          size: fontSize,
        },
      ]
      return next
    })
    setTextValue('')
    setShowTextModal(false)
  }

  // ---------- Envio ----------
  const hasAnyContent = pages.some((p) => p.length > 0)
  const canSend = hasAnyContent

  const handleSend = () => {
    if (!canSend) {
      Alert.alert('Ops', 'Você ainda não escreveu nada.')
      return
    }
    if (contacts.length === 0) {
      Alert.alert('Sem contatos', 'Adicione um contato na aba Perfil antes de enviar.')
      return
    }
    setShowContacts(true)
  }

  const sendTo = async (contact) => {
    setShowContacts(false)
    setSending(true)
    const originalPage = currentPage

    try {
      const capturedImages = []
      for (let i = 0; i < pages.length; i++) {
        setCurrentPage(i)
        await new Promise((resolve) => setTimeout(resolve, 450))

        const uri = await shotRef.current.capture()
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        })
        capturedImages.push(`data:image/png;base64,${base64}`)
      }

      setCurrentPage(originalPage)
      await sendMessage(contact._id, capturedImages)

      Alert.alert('Enviado!', `Sua carta foi enviada para @${contact.username}.`)
      router.replace('/(tabs)')
    } catch (err) {
      console.error('[draw] sendTo error:', err)
      Alert.alert('Erro', err.message || 'Não foi possível enviar.')
    } finally {
      setSending(false)
    }
  }

  // ---------- Renderização de item ----------
  const renderItem = (item, index) => {
    if (item.type === 'path') {
      return (
        <Path
          key={index}
          d={item.d}
          stroke="#1a1a2e"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }
    if (item.type === 'text') {
      const lines = item.content.split('\n')
      return (
        <SvgText
          key={index}
          x={item.x}
          y={item.y}
          fill="#1a1a2e"
          fontSize={item.size}
          fontFamily={FONT_FAMILY}
          fontWeight="500"
        >
          {lines.map((line, i) => (
            <TSpan
              key={i}
              x={item.x}
              dy={i === 0 ? 0 : item.size * 1.2}
            >
              {line || ' '}
            </TSpan>
          ))}
        </SvgText>
      )
    }
    return null
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

      {/* Alternância de modo */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modePill, mode === 'draw' && styles.modePillActive]}
          onPress={() => setMode('draw')}
        >
          <Ionicons
            name="brush"
            size={16}
            color={mode === 'draw' ? '#fff' : '#888'}
          />
          <Text
            style={[styles.modeText, mode === 'draw' && styles.modeTextActive]}
          >
            Desenhar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modePill, mode === 'text' && styles.modePillActive]}
          onPress={() => setMode('text')}
        >
          <Ionicons
            name="text"
            size={16}
            color={mode === 'text' ? '#fff' : '#888'}
          />
          <Text
            style={[styles.modeText, mode === 'text' && styles.modeTextActive]}
          >
            Digitar
          </Text>
        </TouchableOpacity>

        {mode === 'text' && (
          <View style={styles.sizeGroup}>
            {FONT_SIZES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.sizePill,
                  fontSize === s.value && styles.sizePillActive,
                ]}
                onPress={() => setFontSize(s.value)}
              >
                <Text
                  style={[
                    styles.sizeText,
                    fontSize === s.value && styles.sizeTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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

      {/* Dica quando está no modo texto */}
      {mode === 'text' && (
        <Text style={styles.hint}>Toque na tela para escrever</Text>
      )}

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
          onMoveShouldSetResponder={() => mode === 'draw'}
          onResponderGrant={onTouchStart}
          onResponderMove={onTouchMove}
          onResponderRelease={onTouchEnd}
        >
          <Svg style={StyleSheet.absoluteFill}>
            {pages[currentPage].map(renderItem)}
            {mode === 'draw' && currentPath ? (
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

      {/* Toolbar */}
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

      {/* Modal de digitação */}
      <Modal
        visible={showTextModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowTextModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.textModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.textModalCard}>
            <Text style={styles.textModalTitle}>Escrever</Text>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                { fontSize: fontSize, fontFamily: FONT_FAMILY },
              ]}
              value={textValue}
              onChangeText={setTextValue}
              placeholder="Digite aqui..."
              placeholderTextColor="#999"
              multiline
              autoFocus
              textAlignVertical="top"
              scrollEnabled
            />
            <View style={styles.textModalActions}>
              <TouchableOpacity
                style={[styles.textModalBtn, styles.textModalCancel]}
                onPress={() => setShowTextModal(false)}
              >
                <Text style={styles.textModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.textModalBtn, styles.textModalConfirm]}
                onPress={confirmText}
              >
                <Text style={styles.textModalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a274a',
  },
  modePillActive: { backgroundColor: COLORS.primary },
  modeText: { color: '#888', fontSize: 13, fontWeight: '600' },
  modeTextActive: { color: '#fff' },

  sizeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  sizePill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a274a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizePillActive: { backgroundColor: '#4a3f8a' },
  sizeText: { color: '#888', fontSize: 12, fontWeight: '700' },
  sizeTextActive: { color: '#fff' },

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

  hint: {
    color: '#8a86a8',
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 4,
  },

  canvasWrapper: {
    flex: 1,
    margin: 12,
    marginTop: 4,
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

  // Modal de texto
  textModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  textModalCard: {
    backgroundColor: '#1f1f38',
    borderRadius: 20,
    padding: 20,
  },
  textModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#f5f5f0',
    color: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    minHeight: 120,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#d0d0c8',
  },
  textModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  textModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  textModalCancel: { backgroundColor: '#2a274a' },
  textModalCancelText: { color: '#ccc', fontWeight: '600' },
  textModalConfirm: { backgroundColor: COLORS.primary },
  textModalConfirmText: { color: '#fff', fontWeight: '700' },

  // Modal de contatos (inalterado)
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