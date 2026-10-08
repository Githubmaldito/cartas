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
  useWindowDimensions,
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

// Dimensões de layout
const TEXT_START_Y = 40
const TEXT_LEFT = 20
const TEXT_LINE_HEIGHT_FACTOR = 1.35
const TEXT_BLOCK_GAP = 16

export default function Draw() {
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const { contacts, fetchContacts } = useContactsStore()
  const { sendMessage } = useMessagesStore()

  const [pages, setPages] = useState([[]]) // lista de itens por página
  const [currentPage, setCurrentPage] = useState(0)
  const [currentPath, setCurrentPath] = useState('')
  const [fontSize, setFontSize] = useState(18)

  const [showTextModal, setShowTextModal] = useState(false)
  const [textValue, setTextValue] = useState('')

  const [sending, setSending] = useState(false)
  const [showContacts, setShowContacts] = useState(false)

  const shotRef = useRef(null)
  const isDrawing = useRef(false)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchContacts()
  }, [])

  // ---------- Quebra de linha ----------
  const wrapText = (text) => {
    // Largura útil = tela - margens da área - margens do texto
    const usable = screenWidth - 24 - 24 - TEXT_LEFT * 2
    const charWidth = fontSize * 0.55
    const maxChars = Math.max(10, Math.floor(usable / charWidth))

    return text
      .split('\n')
      .flatMap((paragraph) => {
        const words = paragraph.split(' ')
        const lines = []
        let current = ''
        for (const word of words) {
          const candidate = current ? `${current} ${word}` : word
          if (candidate.length <= maxChars) {
            current = candidate
          } else {
            if (current) lines.push(current)
            current = word
          }
        }
        lines.push(current)
        return lines
      })
      .filter((l) => l !== '')
  }

  // ---------- Desenho ----------
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
        next[currentPage] = [...next[currentPage], { type: 'path', d: currentPath }]
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
        next[currentPage] = [
          ...next[currentPage],
          { type: 'path', d: currentPath },
        ]
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


// pro texto
  const openTextModal = () => {
    setTextValue('')
    setShowTextModal(true)
    setTimeout(() => inputRef.current?.focus(), 200)
  }

  const confirmText = () => {
    const content = textValue.trim()
    if (!content) {
      setShowTextModal(false)
      return
    }
    const lines = wrapText(content)
    setPages((prev) => {
      const next = [...prev]
      next[currentPage] = [
        ...next[currentPage],
        { type: 'text', lines, size: fontSize },
      ]
      return next
    })
    setTextValue('')
    setShowTextModal(false)
  }


  const hasAnyContent = pages.some((p) => p.length > 0)
  const canSend = hasAnyContent

  const handleSend = () => {
    if (!canSend) {
      Alert.alert('Ops', 'Você ainda não escreveu nada.')
      return
    }
    if (contacts.length === 0) {
      Alert.alert(
        'Sem contatos',
        'Adicione um contato na aba Perfil antes de enviar.'
      )
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

  // renderiza paths primeiro, depois texts.
  const renderItems = (items) => {
    const paths = items.filter((it) => it.type === 'path')
    const texts = items.filter((it) => it.type === 'text')

    const nodes = []

    // Paths
    paths.forEach((item, i) => {
      nodes.push(
        <Path
          key={`p-${i}`}
          d={item.d}
          stroke="#1a1a2e"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    })

    // Texts empilhados a partir do topo
    let textY = TEXT_START_Y
    texts.forEach((item, i) => {
      const lineHeight = item.size * TEXT_LINE_HEIGHT_FACTOR
      const blockHeight = item.lines.length * lineHeight
      const y = textY
      textY += blockHeight + TEXT_BLOCK_GAP

      nodes.push(
        <SvgText
          key={`t-${i}`}
          x={TEXT_LEFT}
          y={y}
          fill="#1a1a2e"
          fontSize={item.size}
          fontFamily={FONT_FAMILY}
          fontWeight="500"
        >
          {item.lines.map((line, li) => (
            <TSpan key={li} x={TEXT_LEFT} dy={li === 0 ? 0 : lineHeight}>
              {line}
            </TSpan>
          ))}
        </SvgText>
      )
    })

    return nodes
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
            {renderItems(pages[currentPage])}
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

        <TouchableOpacity style={styles.toolBtn} onPress={openTextModal}>
          <Ionicons name="text-outline" size={22} color="#fff" />
          <Text style={styles.toolText}>Texto</Text>
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

      {/* Modal de texto */}
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
            <Text style={styles.textModalTitle}>Adicionar texto</Text>
            <Text style={styles.textModalHint}>
              O texto aparecerá no topo da página.
            </Text>

            {/* Seletor de tamanho */}
            <View style={styles.sizeRow}>
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

      {/* Modal de contato */}
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
    marginTop: 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f0',
  },
  canvas: { flex: 1 },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingVertical: 12,
    paddingBottom: 30,
    gap: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#2a274a',
  },
  sendBtn: { backgroundColor: COLORS.primary },
  toolText: { color: '#fff', fontSize: 11, fontWeight: '600' },

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
    marginBottom: 4,
    textAlign: 'center',
  },
  textModalHint: {
    color: '#8a86a8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sizePill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a274a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizePillActive: { backgroundColor: COLORS.primary },
  sizeText: { color: '#888', fontSize: 13, fontWeight: '700' },
  sizeTextActive: { color: '#fff' },
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

  // Modal de contatos
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