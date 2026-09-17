import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { CORES } from "../lib/theme";
import { View, ActivityIndicator } from "react-native";

function useRotaProtegida() {
  const { session, carregando } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    const dentroDasAbas = segmentos[0] === "(tabs)";
    if (!session && dentroDasAbas) {
      router.replace("/login");
    } else if (session && !dentroDasAbas) {
      router.replace("/(tabs)");
    }
  }, [session, carregando, segmentos]);
}

function LayoutInterno() {
  const { carregando } = useAuth();
  useRotaProtegida();

  if (carregando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: CORES.preto,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={CORES.azul} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={CORES.preto} />
      <LayoutInterno />
    </AuthProvider>
  );
}
