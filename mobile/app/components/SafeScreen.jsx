// pra fazer com que a tela fique de boa 
import { Stack } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
// n sei porque o camoinho tem que ser assim
import COLORS from '../../constants/colors';


const SafeScreen = ({ children, style }) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.container, {paddingTop: insets.top}]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1,
    backgroundColor: COLORS.background,
    }

});

export default SafeScreen;