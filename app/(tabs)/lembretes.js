import { useCallback, useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, Image, Linking, RefreshControl, TextInput } from "react-native";
import { CORES } from "../../lib/theme";
import { Botao, TelaAnimada } from "../../lib/ui";
import { dataIsoParaBr } from "../../lib/format";
import { montarMensagemLembrete, gerarLinkWhatsapp } from "../../lib/constants";
import { clientesParaLembrete, confirmarLembrete } from "../../lib/queries";
import { buscarFotoCliente, obterUrlFoto } from "../../lib/fotos";

export default function Lembretes() {
  const [lembretes, setLembretes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await clientesParaLembrete();
      const comFoto = await Promise.all(
        lista.map(async (item) => {
          try {
            const caminho = await buscarFotoCliente(item.cliente, item.whatsapp);
            const fotoUrl = caminho ? await obterUrlFoto(caminho) : null;
            return { ...item, fotoUrl, mensagem: montarMensagemLembrete(item.veiculo, item.cliente, item.diasPassados) };
          } catch {
            return { ...item, fotoUrl: null, mensagem: montarMensagemLembrete(item.veiculo, item.cliente, item.diasPassados) };
          }
        })
      );
      setLembretes(comFoto);
    } catch (e) {
      console.warn("Erro ao carregar lembretes:", e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function abrirWhatsapp(item, mensagem) {
    const link = gerarLinkWhatsapp(item.whatsapp, mensagem);
    if (!link) {
      alert("Esse cliente não tem WhatsApp cadastrado.");
      return;
    }
    Linking.openURL(link);
  }

  async function marcarEnviado(item) {
    await confirmarLembrete(item.chave, item.cliente, item.whatsapp, item.intervaloAtual);
    carregar();
  }

  function aoEditarMensagem(id, novoTexto) {
    setLembretes((atual) => atual.map((l) => (l.chave === id ? { ...l, mensagem: novoTexto } : l)));
  }

  return (
    <TelaAnimada style={styles.container}>
    <View style={styles.container}>
      <Text style={styles.titulo}>Lembretes de Retorno</Text>
      <Text style={styles.subtitulo}>
        Clientes que passaram 15 dias (ou múltiplos) desde a última lavagem.
      </Text>

      <FlatList
        data={lembretes}
        keyExtractor={(item) => item.chave}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={CORES.azul} />}
        ListEmptyComponent={
          !carregando && <Text style={styles.vazio}>Nenhum lembrete pendente no momento. 🎉</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.linhaTopo}>
              {item.fotoUrl ? (
                <Image source={{ uri: item.fotoUrl }} style={styles.foto} />
              ) : (
                <View style={styles.fotoVazia}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.nomeCliente}>{item.cliente}</Text>
                <Text style={styles.diasTexto}>{item.diasPassados} dias desde a última lavagem</Text>
                <Text style={styles.detalheTexto}>
                  Última: {dataIsoParaBr(item.ultimaData)}
                  {item.veiculo ? ` • ${item.veiculo}` : ""}
                  {item.whatsapp ? ` • ${item.whatsapp}` : " • sem WhatsApp"}
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.mensagemInput}
              value={item.mensagem}
              onChangeText={(t) => aoEditarMensagem(item.chave, t)}
              multiline
            />

            <View style={styles.linhaBotoes}>
              <View style={{ flex: 1 }}>
                <Botao texto="Abrir WhatsApp" onPress={() => abrirWhatsapp(item, item.mensagem)} />
              </View>
              <View style={{ flex: 1 }}>
                <Botao texto="Marcar enviado" variante="secundario" onPress={() => marcarEnviado(item)} />
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
  subtitulo: { color: CORES.cinza, fontSize: 12, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  vazio: { color: CORES.cinza, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: CORES.pretoCard, borderRadius: 12, padding: 14, marginBottom: 12 },
  linhaTopo: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  foto: { width: 48, height: 48, borderRadius: 24 },
  fotoVazia: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: CORES.cinzaEscuro,
    alignItems: "center", justifyContent: "center",
  },
  nomeCliente: { color: CORES.branco, fontSize: 15, fontWeight: "700" },
  diasTexto: { color: CORES.vermelho, fontSize: 12, marginTop: 2 },
  detalheTexto: { color: CORES.cinza, fontSize: 11, marginTop: 2 },
  mensagemInput: {
    backgroundColor: CORES.cinzaEscuro, color: CORES.branco, borderRadius: 8,
    padding: 10, fontSize: 12.5, minHeight: 70, textAlignVertical: "top", marginBottom: 10,
  },
  linhaBotoes: { flexDirection: "row", gap: 8 },
});
