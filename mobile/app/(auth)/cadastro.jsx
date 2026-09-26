import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import React, { useState } from 'react'
import styles from '../../assets/styles/cadastro.styles'
import COLORS from '../../constants/colors'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import useAuthStore from '../../store/authStore'

const Cadastro = () => {

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // const [isLoading, setIsloading] = useState(false)
  const { user, isLoading, register, token } = useAuthStore();
  const router = useRouter();


  const handleCadastro = async () => {
    const result = await register(username, email, password);
    if (!result.success) {
      Alert.alert('Erro', result.message);
    } else {
      // Redirecionar para a tela principal após cadastro bem-sucedido
      router.back()
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* header */}
        <View style={styles.header}>
          <Text style={styles.title}>Título do App📚</Text>
          <Text style={styles.subtitle}>Compartilhe a sua leitura.</Text>
        </View>

        {/* form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.primary}
              />
              <TextInput
                style={styles.input}
                placeholder="Digite o seu nome"
                value={username}
                onChangeText={setUsername}
                autoCapitalize='none'
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              {/* ícone de email */}
              <Ionicons
                name='mail-outline'
                size={20}
                color={COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Digite o seu email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* input de senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.primary}
              />
              <TextInput
                style={styles.input}
                placeholder="Crie sua senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={COLORS.primary}
                onPress={() => setShowPassword(!showPassword)}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleCadastro} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Cadstrar-se</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já possui uma conta?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Faça Login</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  )
}
export default Cadastro