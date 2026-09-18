import { Tabs } from "expo-router";
import { Text, View, Image, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CORES } from "../../lib/theme";
import { useAuth } from "../../lib/auth-context";

function Icone({ emoji, cor }) {
  return <Text style={{ fontSize: 20, color: cor }}>{emoji}</Text>;
}

export default function LayoutAbas() {
  const { sair } = useAuth();

  const confirmarSaida = () => {
    Alert.alert("Sair da conta", "Quer mesmo sair? Vai precisar logar de novo.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => sair() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: CORES.preto }}>
      <View style={styles.barraTopo}>
        <View>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subMarca}>Gestão Financeira</Text>
        </View>
        <TouchableOpacity
          style={styles.botaoSair}
          onPress={confirmarSaida}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.textoSair}>Sair</Text>
        </TouchableOpacity>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: CORES.azul,
          tabBarInactiveTintColor: CORES.cinza,
          // O React Navigation usa fundo branco por padrão no container de
          // cada tela — sem isso, dava aquele "flash branco" por trás de
          // fade ao trocar de aba.
          sceneContainerStyle: { backgroundColor: CORES.preto },
          tabBarStyle: {
            backgroundColor: CORES.cinzaEscuro,
            borderTopWidth: 0,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => <Icone emoji="📊" cor={color} />,
          }}
        />
        <Tabs.Screen
          name="nova"
          options={{
            title: "Nova",
            tabBarIcon: ({ color }) => <Icone emoji="➕" cor={color} />,
          }}
        />
        <Tabs.Screen
          name="historico"
          options={{
            title: "Histórico",
            tabBarIcon: ({ color }) => <Icone emoji="📋" cor={color} />,
          }}
        />
        <Tabs.Screen
          name="relatorio"
          options={{
            title: "Relatório",
            tabBarIcon: ({ color }) => <Icone emoji="📈" cor={color} />,
          }}
        />
        <Tabs.Screen
          name="lembretes"
          options={{
            title: "Lembretes",
            tabBarIcon: ({ color }) => <Icone emoji="🔔" cor={color} />,
          }}
        />
        <Tabs.Screen
          name="clientes"
          options={{
            title: "Clientes",
            tabBarIcon: ({ color }) => <Icone emoji="👥" cor={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  barraTopo: {
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: CORES.preto,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  logo: { width: 140, height: 40, alignSelf: "flex-start" },
  subMarca: { color: CORES.cinza, fontSize: 12, marginTop: 4 },
  botaoSair: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CORES.cinzaEscuro,
  },
  textoSair: { color: CORES.cinza, fontSize: 12, fontWeight: "600" },
});
