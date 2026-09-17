import { useCallback, useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { CORES, CORES_TIPO } from "../../lib/theme";
import { Cartao, CartaoValor } from "../../lib/ui";
import { formatarMoeda, dataIsoParaBr, MESES_PT } from "../../lib/format";
import { resumoMes, ultimosNMeses, pendenciasEmAberto } from "../../lib/queries";

export default function Dashboard() {
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState({ Entrada: 0, Despesa: 0, Saida: 0, saldo: 0 });
  const [historico, setHistorico] = useState([]);
  const [pendencias, setPendencias] = useState([]);

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [r, h, p] = await Promise.all([
        resumoMes(anoAtual, mesAtual),
        ultimosNMeses(6),
        pendenciasEmAberto(),
      ]);
      setResumo(r);
      setHistorico(h);
      setPendencias(p);
    } catch (e) {
      console.warn("Erro ao carregar dashboard:", e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const maiorValor = Math.max(
    1,
    ...historico.flatMap((m) => [m.Entrada, m.Despesa + m.Saida])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={CORES.azul} />
      }
    >
      <Text style={styles.titulo}>
        Resumo de {MESES_PT[mesAtual]} de {anoAtual}
      </Text>

      <View style={styles.linhaCartoes}>
        <CartaoValor titulo="Receita do mês" valor={formatarMoeda(resumo.Entrada)} cor={CORES.verde} />
        <CartaoValor
          titulo="Despesas do mês"
          valor={formatarMoeda(resumo.Despesa + resumo.Saida)}
          cor={CORES.vermelho}
        />
      </View>
      <View style={styles.linhaCartoes}>
        <CartaoValor
          titulo="Saldo do mês"
          valor={formatarMoeda(resumo.saldo)}
          cor={resumo.saldo >= 0 ? CORES.verde : CORES.vermelho}
        />
        <CartaoValor titulo="Pendências" valor={String(pendencias.length)} cor={CORES.azul} />
      </View>

      <Cartao style={{ marginTop: 8 }}>
        <Text style={styles.subtitulo}>Últimos 6 meses</Text>
        <View style={styles.grafico}>
          {historico.map((m) => (
            <View key={`${m.ano}-${m.mes}`} style={styles.colunaGrafico}>
              <View style={styles.barrasGrupo}>
                <View
                  style={[
                    styles.barra,
                    {
                      height: Math.max(4, (m.Entrada / maiorValor) * 90),
                      backgroundColor: CORES.azul,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.barra,
                    {
                      height: Math.max(4, ((m.Despesa + m.Saida) / maiorValor) * 90),
                      backgroundColor: CORES.vermelho,
                    },
                  ]}
                />
              </View>
              <Text style={styles.rotuloMes}>
                {MESES_PT[m.mes].substring(0, 3)}/{String(m.ano).slice(2)}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.legenda}>
          <View style={styles.legendaItem}>
            <View style={[styles.legendaCor, { backgroundColor: CORES.azul }]} />
            <Text style={styles.legendaTexto}>Entrada</Text>
          </View>
          <View style={styles.legendaItem}>
            <View style={[styles.legendaCor, { backgroundColor: CORES.vermelho }]} />
            <Text style={styles.legendaTexto}>Despesa</Text>
          </View>
        </View>
      </Cartao>

      {pendencias.length > 0 && (
        <Cartao style={{ marginTop: 16 }}>
          <Text style={styles.subtitulo}>⚠ Pendências em aberto</Text>
          {pendencias.slice(0, 6).map((p) => (
            <View key={p.id} style={styles.linhaPendencia}>
              <Text style={[styles.textoPendencia, { color: CORES_TIPO[p.tipo] || CORES.branco }]}>
                {p.prazo ? dataIsoParaBr(p.prazo) : "Sem prazo"} — {p.tipo} —{" "}
                {p.descricao || p.categoria_despesa || "-"} — {formatarMoeda(p.valor)}
              </Text>
            </View>
          ))}
          {pendencias.length > 6 && (
            <Text style={styles.maisPendencias}>
              + {pendencias.length - 6} outra(s)... veja tudo no Histórico
            </Text>
          )}
        </Cartao>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.preto },
  titulo: { color: CORES.branco, fontSize: 20, fontWeight: "800", marginBottom: 14 },
  subtitulo: { color: CORES.azul, fontSize: 13, fontWeight: "700", marginBottom: 12 },
  linhaCartoes: { flexDirection: "row", gap: 10, marginBottom: 10 },
  grafico: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 110,
  },
  colunaGrafico: { alignItems: "center", flex: 1 },
  barrasGrupo: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 90 },
  barra: { width: 9, borderRadius: 3 },
  rotuloMes: { color: CORES.cinza, fontSize: 9, marginTop: 6 },
  legenda: { flexDirection: "row", gap: 16, marginTop: 14, justifyContent: "center" },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendaCor: { width: 9, height: 9, borderRadius: 2 },
  legendaTexto: { color: CORES.cinza, fontSize: 11 },
  linhaPendencia: { paddingVertical: 4 },
  textoPendencia: { fontSize: 12.5 },
  maisPendencias: { color: CORES.cinza, fontSize: 11, marginTop: 4 },
});
