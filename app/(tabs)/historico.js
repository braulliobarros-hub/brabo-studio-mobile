import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { CORES, CORES_TIPO } from "../../lib/theme";
import { Cartao, Botao, Campo, Seletor } from "../../lib/ui";
import { CampoData } from "../../lib/CampoData";
import { formatarMoeda, dataIsoParaBr, MESES_PT } from "../../lib/format";
import {
  buscarTransacoes,
  excluirTransacao,
  atualizarTransacao,
  mesesDisponiveis,
} from "../../lib/queries";
import { FORMAS_PAGAMENTO, CATEGORIAS_DESPESA } from "../../lib/constants";

export default function Historico() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroMes, setFiltroMes] = useState("Todos");
  const [mesesOpcoes, setMesesOpcoes] = useState(["Todos"]);

  const [selecionadoId, setSelecionadoId] = useState(null);
  const [editando, setEditando] = useState(null); // registro em edição
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const meses = await mesesDisponiveis();
      setMesesOpcoes(["Todos", ...meses]);

      const dados = await buscarTransacoes({
        tipo: filtroTipo,
        status: filtroStatus,
        mes: filtroMes !== "Todos" ? filtroMes : undefined,
      });
      setRegistros(dados);
    } catch (e) {
      console.warn("Erro ao carregar histórico:", e.message);
    } finally {
      setCarregando(false);
    }
  }, [filtroTipo, filtroStatus, filtroMes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function alternarSelecao(item) {
    setSelecionadoId((atual) => (atual === item.id ? null : item.id));
  }

  function confirmarExclusao(item) {
    Alert.alert(
      "Excluir lançamento",
      `Tem certeza que quer excluir "${item.descricao || item.cliente || item.tipo}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await excluirTransacao(item.id);
            setSelecionadoId(null);
            carregar();
          },
        },
      ]
    );
  }

  function abrirEdicao(item) {
    setEditando({
      id: item.id,
      tipo: item.tipo,
      data: item.data,
      valor: String(item.valor).replace(".", ","),
      status: item.status,
      forma_pagamento: item.forma_pagamento || "Pix",
      categoria_despesa: item.categoria_despesa || CATEGORIAS_DESPESA[0],
      cliente: item.cliente || "",
      descricao: item.descricao || "",
    });
  }

  function fecharEdicao() {
    setEditando(null);
  }

  async function salvarEdicao() {
    if (!editando) return;
    const valorLimpo = editando.valor.replace(/\./g, "").replace(",", ".");
    const valorNumerico = parseFloat(valorLimpo);
    if (!valorNumerico || valorNumerico <= 0) {
      Alert.alert("Valor inválido", "Digita um valor válido, maior que zero.");
      return;
    }
    setSalvandoEdicao(true);
    try {
      const dados = {
        data: editando.data,
        valor: valorNumerico,
        status: editando.status,
        forma_pagamento: editando.forma_pagamento,
        descricao: editando.descricao.trim() || null,
      };
      if (editando.tipo === "Entrada") {
        dados.cliente = editando.cliente.trim() || null;
      } else {
        dados.categoria_despesa = editando.categoria_despesa;
      }
      await atualizarTransacao(editando.id, dados);
      setEditando(null);
      setSelecionadoId(null);
      carregar();
    } catch (e) {
      Alert.alert("Erro ao salvar", e.message);
    } finally {
      setSalvandoEdicao(false);
    }
  }

  const saldoFiltrado = registros.reduce(
    (soma, r) => soma + (r.tipo === "Entrada" ? Number(r.valor) : -Number(r.valor)),
    0
  );

  const statusOpcoesEdicao =
    editando?.tipo === "Entrada" ? ["Pago", "Parcialmente Pago", "Pendente"] : ["Pago", "Pendente"];

  return (
    <View style={styles.container}>
      <View style={styles.filtros}>
        <View style={{ flex: 1 }}>
          <Seletor label="Tipo" value={filtroTipo} onValueChange={setFiltroTipo} opcoes={["Todos", "Entrada", "Despesa", "Saida"]} />
        </View>
        <View style={{ flex: 1 }}>
          <Seletor label="Status" value={filtroStatus} onValueChange={setFiltroStatus} opcoes={["Todos", "Pago", "Pendente"]} />
        </View>
      </View>
      <Seletor label="Mês" value={filtroMes} onValueChange={setFiltroMes} opcoes={mesesOpcoes} />

      <Text style={styles.saldoFiltro}>Saldo do filtro: {formatarMoeda(saldoFiltrado)}</Text>

      <FlatList
        data={registros}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={CORES.azul} />}
        ListEmptyComponent={
          !carregando && <Text style={styles.vazio}>Nenhum lançamento encontrado.</Text>
        }
        renderItem={({ item }) => {
          const aberto = selecionadoId === item.id;
          return (
            <View style={[styles.cartaoLinha, aberto && styles.cartaoLinhaAberto]}>
              <TouchableOpacity style={styles.linha} onPress={() => alternarSelecao(item)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tipoTexto, { color: CORES_TIPO[item.tipo] || CORES.branco }]}>
                    {item.tipo === "Saida" ? "Saída" : item.tipo}
                  </Text>
                  <Text style={styles.descricaoTexto}>
                    {item.cliente || item.descricao || item.categoria_despesa || "-"}
                  </Text>
                  <Text style={styles.detalheTexto}>
                    {dataIsoParaBr(item.data)}
                    {item.veiculo ? ` • ${item.veiculo}${item.modelo ? " " + item.modelo : ""}` : ""}
                    {item.servico ? ` • ${item.servico}` : ""}
                    {item.forma_pagamento ? ` • ${item.forma_pagamento}` : ""}
                    {" • "}
                    {item.status}
                  </Text>
                </View>
                <Text style={[styles.valorTexto, { color: CORES_TIPO[item.tipo] || CORES.branco }]}>
                  {formatarMoeda(item.valor)}
                </Text>
              </TouchableOpacity>

              {aberto && (
                <View style={styles.linhaAcoes}>
                  <TouchableOpacity style={[styles.botaoAcao, styles.botaoEditar]} onPress={() => abrirEdicao(item)}>
                    <Text style={styles.botaoAcaoTexto}>✏️ Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.botaoAcao, styles.botaoExcluir]} onPress={() => confirmarExclusao(item)}>
                    <Text style={styles.botaoAcaoTexto}>🗑️ Excluir</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
      <Text style={styles.dicaExcluir}>Toca num lançamento pra editar ou excluir</Text>

      <Modal visible={!!editando} animationType="slide" transparent onRequestClose={fecharEdicao}>
        <View style={styles.modalFundo}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalCaixa}
          >
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.modalTitulo}>Editar lançamento</Text>

              {editando && (
                <Cartao>
                  <CampoData
                    label="Data"
                    valorIso={editando.data}
                    onChange={(v) => setEditando((e) => ({ ...e, data: v }))}
                  />
                  <Campo
                    label="Valor (R$)"
                    value={editando.valor}
                    onChangeText={(v) => setEditando((e) => ({ ...e, valor: v }))}
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                  />
                  <Seletor
                    label="Status"
                    value={editando.status}
                    onValueChange={(v) => setEditando((e) => ({ ...e, status: v }))}
                    opcoes={statusOpcoesEdicao}
                  />
                  <Seletor
                    label="Forma de pagamento"
                    value={editando.forma_pagamento}
                    onValueChange={(v) => setEditando((e) => ({ ...e, forma_pagamento: v }))}
                    opcoes={FORMAS_PAGAMENTO}
                  />
                  {editando.tipo === "Entrada" ? (
                    <Campo
                      label="Cliente"
                      value={editando.cliente}
                      onChangeText={(v) => setEditando((e) => ({ ...e, cliente: v }))}
                      placeholder="Nome do cliente"
                    />
                  ) : (
                    <Seletor
                      label="Categoria"
                      value={editando.categoria_despesa}
                      onValueChange={(v) => setEditando((e) => ({ ...e, categoria_despesa: v }))}
                      opcoes={CATEGORIAS_DESPESA}
                    />
                  )}
                  <Campo
                    label="Descrição / observação"
                    value={editando.descricao}
                    onChangeText={(v) => setEditando((e) => ({ ...e, descricao: v }))}
                    multiline
                  />

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Botao texto="Cancelar" variante="secundario" onPress={fecharEdicao} disabled={salvandoEdicao} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Botao texto="Salvar" onPress={salvarEdicao} carregando={salvandoEdicao} />
                    </View>
                  </View>
                </Cartao>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.preto },
  filtros: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  saldoFiltro: { color: CORES.azul, fontSize: 13, fontWeight: "700", paddingHorizontal: 16, marginBottom: 4 },
  vazio: { color: CORES.cinza, textAlign: "center", marginTop: 40 },
  cartaoLinha: {
    backgroundColor: CORES.pretoCard,
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
  },
  cartaoLinhaAberto: {
    borderWidth: 1,
    borderColor: CORES.azul,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  tipoTexto: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  descricaoTexto: { color: CORES.branco, fontSize: 14, fontWeight: "600", marginTop: 2 },
  detalheTexto: { color: CORES.cinza, fontSize: 11, marginTop: 3 },
  valorTexto: { fontSize: 14, fontWeight: "800", marginLeft: 8 },
  dicaExcluir: { color: CORES.cinza, fontSize: 10, textAlign: "center", paddingBottom: 8 },
  linhaAcoes: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#2A2A32",
  },
  botaoAcao: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  botaoEditar: { backgroundColor: "#0064FE22" },
  botaoExcluir: { backgroundColor: "#EF444422" },
  botaoAcaoTexto: { color: CORES.branco, fontSize: 13, fontWeight: "700" },
  modalFundo: {
    flex: 1,
    backgroundColor: "#000000AA",
    justifyContent: "flex-end",
  },
  modalCaixa: {
    backgroundColor: CORES.preto,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "88%",
  },
  modalTitulo: { color: CORES.branco, fontSize: 18, fontWeight: "800", marginBottom: 14 },
});
