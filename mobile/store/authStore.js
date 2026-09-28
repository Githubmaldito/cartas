import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api'

const useAuthStore = create((set, get) => ({
    user: null,
    token: null,
    isLoading: false,

    register: async (username, email, password) => {
        set({ isLoading: true });
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao cadastrar');
            }
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            await AsyncStorage.setItem('token', data.token);
            set({ user: data.user, token: data.token, isLoading: false });
            return { success: true, message: 'Usuário cadastrado com sucesso' };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.message };
        }
    },

    login: async (email, password) => {
        set({ isLoading: true });
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao fazer login');
            }
            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            await AsyncStorage.setItem('token', data.token);
            set({ user: data.user, token: data.token, isLoading: false });
            return { success: true, message: 'Login realizado com sucesso' };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.message };
        }
    },

    // Valida o token no backend. Retorna true se ainda for válido.
    validateToken: async (token) => {
        try {
            const response = await fetch(`${API_URL}/users/contacts`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });

            // Token inválido, expirado ou usuário deletado
            if (response.status === 401) {
                return { valid: false, reason: 'unauthorized' };
            }

            // Outro erro do servidor (500, etc.) — considera válido
            // mas não atualiza nada, só para não deslogar o usuário.
            if (!response.ok) {
                return { valid: true, reason: 'server-error' };
            }

            return { valid: true, reason: 'ok' };
        } catch (error) {
            // Erro de rede (offline, servidor fora do ar) — mantém sessão
            console.log('Erro ao validar token (offline?):', error.message);
            return { valid: true, reason: 'network-error' };
        }
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            const token = await AsyncStorage.getItem('token');
            const userJson = await AsyncStorage.getItem('user');
            const user = userJson ? JSON.parse(userJson) : null;

            // Sem token ou user salvos, não está logado
            if (!token || !user) {
                set({ user: null, token: null, isLoading: false });
                return;
            }

            // Valida no backend antes de aceitar a sessão
            const result = await get().validateToken(token);

            if (!result.valid) {
                // Token inválido — limpa tudo
                console.log('Token inválido, fazendo logout automático');
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('user');
                set({ user: null, token: null, isLoading: false });
                return;
            }

            // Token válido — mantém a sessão
            set({ user, token, isLoading: false });
        } catch (error) {
            console.log('Erro ao verificar autenticação:', error);
            set({ isLoading: false });
        }
    },

    logout: async () => {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
        set({ token: null, user: null });
    },
}))

export default useAuthStore;