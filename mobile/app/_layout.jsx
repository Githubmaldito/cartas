import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "./components/SafeScreen";
import useAuthStore from "../store/authStore";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

const RootLayout = () => {
  const router = useRouter();
  const segments = useSegments();
  const { checkAuth, user, token, isLoading } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await checkAuth();
      setIsReady(true);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!isReady || isLoading) return;

    const isAuthScreen = segments[0] === "(auth)";
    const isSignedIn = user && token;

    if (!isAuthScreen && !isSignedIn) {
      router.replace("/(auth)");
    } else if (isAuthScreen && isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [segments, user, token, router, isReady, isLoading]);

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeScreen>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </SafeScreen>
    </SafeAreaProvider>
  );
};

export default RootLayout;