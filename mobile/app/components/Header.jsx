import { View, Text } from 'react-native'
import useAuthStore from '../../store/authStore'
import React from 'react'
import { Image } from 'expo-image'
import styles from '../../assets/styles/perfil.styles'
const Header = () => {
    const { user } = useAuthStore()

    if (!user) return <Text>Nada</Text>
    return (
        <View style={styles.profileHeader}>
            <Image source={{ uri: user.profileImage }} style={styles.profileImage} />

            <View style={styles.profileInfo}>
                <Text style={styles.username}>{user.username}</Text>
                <Text style={styles.email}>{user.email}</Text>
            </View>

        </View>
    )
}

export default Header