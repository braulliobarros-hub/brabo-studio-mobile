import { useCallback, useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, Image, TextInput, RefreshControl, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CORES } from "../../lib/theme";
import { Botao, TelaAnimada } from "../../lib/ui";
import { dataIsoParaBr } from "../../lib/format";
import { listarClientesDetalhado } from "../../lib/queries";
import { enviarFotoCliente, removerFotoCliente, buscarFotoCliente, obterUrlFoto } from "../../lib/fotos";
import { useAuth } from "../../lib/auth-context";

export default function Clientes() {
  const { usuario } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviandoFoto, setEnviandoFoto] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await listarClientesDetalhado();
      const comFoto = await Promise.all(
        lista.map(async (c) => {
          const caminho = await buscarFotoCliente(c.cliente, c.whatsapp);
          const fotoUrl = caminho ? await obterUrlFoto(caminho) : null;
          return { ...c, caminhoFoto: caminho, fotoUrl };
        })
      );
      setClientes(comFoto);
    } catch (e) {
      console.warn("Erro ao carregar clientes:", e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function trocarFoto(cliente) {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert("Permissão necessária", "Preciso de acesso às fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled) return;

    setEnviandoFoto(cliente.cliente);
    try {
      await enviarFotoCliente(usuario.id, cliente.cliente, cliente.whatsapp, resultado.assets[0].uri);
      await carregar();
    } catch (e) {
      Alert.alert("Erro ao salvar foto", e.message);
    } finally {
      setEnviandoFoto(null);
    }
  }

  function removerFoto(cliente) {
    Alert.alert("Remover foto", `Remover a foto de ${cliente.cliente}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await removerFotoCliente(cliente.cliente, cliente.whatsapp);
          carregar();
        },
      },
    ]);
  }

  const filtrados = clientes.filter((c) =>
    (c.cliente || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <TelaAnimada style={styles.container}>
    <View style={styles.container}>
      <Text style={styles.titulo}>Clientes</Text>
      <TextInput
        style={styles.busca}
        placeholder="Buscar pelo nome..."
        placeholderTextColor={CORES.cinza}
        value={busca}
        onChangeText={setBusca}
      />

      <FlatList
        data={filtrados}
        keyExtractor={(item, i) => `${item.cliente}-${i}`}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={CORES.azul} />}
        ListEmptyComponent={!carregando && <Text style={styles.vazio}>Nenhum cliente encontrado.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.fotoUrl ? (
              <Image source={{ uri: item.fotoUrl }} style={styles.foto} />
            ) : (
              <View style={styles.fotoVazia}>
                <Text style={{ fontSize: 22 }}>👤</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.nome}>{item.cliente}</Text>
              {item.whatsapp ? <Text style={styles.whatsapp}>📱 {item.whatsapp}</Text> : null}
              <Text style={styles.detalhe}>
                Última visita: {dataIsoParaBr(item.ultimaData)}
                {item.veiculo ? ` • ${item.veiculo}${item.modelo ? " " + item.modelo : ""}` : ""}
              </Text>
              <View style={styles.linhaBotoesFoto}>
                <Botao
                  texto={item.caminhoFoto ? "Trocar Foto" : "Adicionar Foto"}
                  variante="secundario"
                  carregando={enviandoFoto === item.cliente}
                  onPress={() => trocarFoto(item)}
                />
                {item.caminhoFoto && (
                  <Botao texto="Remover" variante="perigo" onPress={() => removerFoto(item)} />
                )}
              </View>
            </View>
          </View>
        )}
      />
    </View>
    </TelaAnimada>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.preto },
  titulo: { color: CORES.branco, fontSize: 20, fontWeight: "800", paddingHorizontal: 16, paddingTop: 16 },
  busca: {
    backgroundColor: CORES.cinzaEscuro, color: CORES.branco, borderRadius: 8,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  vazio: { color: CORES.cinza, textAlign: "center", marginTop: 40 },
  card: {
    flexDirection: "row", backgroundColor: CORES.pretoCard, borderRadius: 12,
    padding: 14, marginBottom: 10, alignItems: "flex-start",
  },
  foto: { width: 56, height: 56, borderRadius: 28 },
  fotoVazia: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: CORES.cinzaEscuro,
    alignItems: "center", justifyContent: "center",
  },
  nome: { color: CORES.branco, fontSize: 15, fontWeight: "700" },
  whatsapp: { color: CORES.cinza, fontSize: 12, marginTop: 2 },
  detalhe: { color: CORES.cinza, fontSize: 11, marginTop: 2, marginBottom: 8 },
  linhaBotoesFoto: { flexDirection: "row", gap: 8 },
});
