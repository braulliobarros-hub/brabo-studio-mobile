import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { CORES, CORES_TIPO } from "../../lib/theme";
import { Seletor } from "../../lib/ui";
import { formatarMoeda, dataIsoParaBr, MESES_PT } from "../../lib/format";
import { buscarTransacoes, excluirTransacao, mesesDisponiveis } from "../../lib/queries";

export default function Historico() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroMes, setFiltroMes] = useState("Todos");
  const [mesesOpcoes, setMesesOpcoes] = useState(["Todos"]);

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
            carregar();
          },
        },
      ]
    );
  }

  const saldoFiltrado = registros.reduce(
    (soma, r) => soma + (r.tipo === "Entrada" ? Number(r.valor) : -Number(r.valor)),
    0
  );

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
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.linha} onLongPress={() => confirmarExclusao(item)}>
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
        )}
      />
      <Text style={styles.dicaExcluir}>Segura o dedo num lançamento pra excluir</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.preto },
  filtros: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  saldoFiltro: { color: CORES.azul, fontSize: 13, fontWeight: "700", paddingHorizontal: 16, marginBottom: 4 },
  vazio: { color: CORES.cinza, textAlign: "center", marginTop: 40 },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CORES.pretoCard,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  tipoTexto: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  descricaoTexto: { color: CORES.branco, fontSize: 14, fontWeight: "600", marginTop: 2 },
  detalheTexto: { color: CORES.cinza, fontSize: 11, marginTop: 3 },
  valorTexto: { fontSize: 14, fontWeight: "800", marginLeft: 8 },
  dicaExcluir: { color: CORES.cinza, fontSize: 10, textAlign: "center", paddingBottom: 8 },
});
