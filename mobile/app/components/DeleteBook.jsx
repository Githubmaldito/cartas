import { View, Text, TouchableOpacity, Modal } from 'react-native'
import React, { useState } from 'react'
import useAuthStore from '../../store/authStore'
import styles from '../../assets/styles/perfil.styles'

const Delete = () => {
  const { Delete } = useAuthStore()
  const [modalVisible, setModalVisible] = useState(false)

  return (
    <>
      <TouchableOpacity style={styles.Delete} onPress={() => setModalVisible(true)}>
        <Text style={styles.DeleteText}>Sair</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Atenção</Text>
            <Text style={styles.modalText}>
              Tem certeza que quer sair da conta?
            </Text>
            
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  setModalVisible(false)
                  Delete()
                }}
              >
                <Text style={styles.confirmButtonText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

export default Delete