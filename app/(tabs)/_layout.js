import { Tabs } from "expo-router";
import { Text, View, StyleSheet } from "react-native";
import { CORES } from "../../lib/theme";

function Icone({ emoji, cor }) {
  return <Text style={{ fontSize: 20, color: cor }}>{emoji}</Text>;
}

export default function LayoutAbas() {
  return (
    <View style={{ flex: 1, backgroundColor: CORES.preto }}>
      <View style={styles.barraTopo}>
        <Text style={styles.marca}>
          BRABO<Text style={{ color: CORES.azul }}>STUDIO</Text>
        </Text>
        <Text style={styles.subMarca}>Gestão Financeira</Text>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: CORES.azul,
          tabBarInactiveTintColor: CORES.cinza,
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
  },
  marca: { color: CORES.branco, fontSize: 20, fontWeight: "800" },
  subMarca: { color: CORES.cinza, fontSize: 12, marginTop: 2 },
});
