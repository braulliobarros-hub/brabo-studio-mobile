import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { CORES } from "../../lib/theme";
import { Cartao, CartaoValor, Botao, Seletor, TelaAnimada } from "../../lib/ui";
import { formatarMoeda, MESES_PT } from "../../lib/format";
import {
  resumoMes,
  resumoPorServico,
  resumoPorVeiculo,
  resumoPorPagamento,
  resumoPorCategoria,
  buscarTransacoes,
} from "../../lib/queries";
import { CATEGORIA_NATUREZA } from "../../lib/constants";

const hoje = new Date();
const ANOS = Array.from({ length: 5 }, (_, i) => String(hoje.getFullYear() - 3 + i));
const MESES_OPCOES = Array.from({ length: 12 }, (_, i) => String(i + 1));

export default function RelatorioMensal() {
  const [ano, setAno] = useState(String(hoje.getFullYear()));
  const [mes, setMes] = useState(String(hoje.getMonth() + 1));
  const [carregando, setCarregando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [relatorio, setRelatorio] = useState(null);

  async function gerar() {
    setCarregando(true);
    try {
      const anoNum = parseInt(ano, 10);
      const mesNum = parseInt(mes, 10);
      const [resumo, porServico, porVeiculo, porPagamento, porCategoria, registros] = await Promise.all([
        resumoMes(anoNum, mesNum),
        resumoPorServico(anoNum, mesNum),
        resumoPorVeiculo(anoNum, mesNum),
        resumoPorPagamento(anoNum, mesNum),
        resumoPorCategoria(anoNum, mesNum),
        buscarTransacoes({ mes: `${anoNum}-${String(mesNum).padStart(2, "0")}` }),
      ]);

      let totalFixa = 0, totalVariavel = 0, totalInvestimento = 0, totalRetirada = 0;
      for (const [categoria, total] of Object.entries(porCategoria)) {
        const natureza = CATEGORIA_NATUREZA[categoria] || "Variável";
        if (natureza === "Fixa") totalFixa += total;
        else if (natureza === "Investimento") totalInvestimento += total;
        else if (natureza === "Retirada") totalRetirada += total;
        else totalVariavel += total;
      }

      setRelatorio({
        ano: anoNum, mes: mesNum, resumo, porServico, porVeiculo, porPagamento,
        totalFixa, totalVariavel, totalInvestimento, totalRetirada, registros,
      });
    } catch (e) {
      Alert.alert("Erro ao gerar relatório", e.message);
    } finally {
      setCarregando(false);
    }
  }

  async function exportarPdf() {
    if (!relatorio) return;
    setGerandoPdf(true);
    try {
      const html = montarHtmlRelatorio(relatorio);

      if (Platform.OS === "web") {
        // Na web, expo-print/expo-sharing não existem — abre uma aba nova já
        // pronta pra imprimir/salvar como PDF pelo próprio navegador.
        const janela = window.open("", "_blank");
        if (!janela) {
          Alert.alert("Bloqueado pelo navegador", "Permite pop-ups nesse site pra gerar o PDF.");
          return;
        }
        janela.document.write(html);
        janela.document.close();
        janela.focus();
        setTimeout(() => janela.print(), 400);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Relatório Brabo Studio" });
        } else {
          Alert.alert("PDF gerado", `Salvo em: ${uri}`);
        }
      }
    } catch (e) {
      Alert.alert("Erro ao gerar PDF", e.message);
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <TelaAnimada style={styles.container}>
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={styles.titulo}>Relatório Mensal</Text>

      <View style={styles.linhaSeletores}>
        <View style={{ flex: 1 }}>
          <Seletor label="Mês" value={mes} onValueChange={setMes} opcoes={MESES_OPCOES} />
        </View>
        <View style={{ flex: 1 }}>
          <Seletor label="Ano" value={ano} onValueChange={setAno} opcoes={ANOS} />
        </View>
      </View>
      <Botao texto="Gerar Relatório" onPress={gerar} carregando={carregando} />

      {relatorio && (
        <>
          <Text style={styles.subtituloRelatorio}>
            Balanço — {MESES_PT[relatorio.mes]} de {relatorio.ano}
          </Text>

          <View style={styles.linhaCartoes}>
            <CartaoValor titulo="Entradas" valor={formatarMoeda(relatorio.resumo.Entrada)} cor={CORES.verde} />
            <CartaoValor titulo="Despesas" valor={formatarMoeda(relatorio.resumo.Despesa)} cor={CORES.vermelho} />
          </View>
          <View style={styles.linhaCartoes}>
            <CartaoValor titulo="Saídas" valor={formatarMoeda(relatorio.resumo.Saida)} cor={CORES.laranja} />
            <CartaoValor
              titulo="Saldo Final"
              valor={formatarMoeda(relatorio.resumo.saldo)}
              cor={relatorio.resumo.saldo >= 0 ? CORES.verde : CORES.vermelho}
            />
          </View>

          <Cartao style={{ marginTop: 10 }}>
            <Text style={styles.subtitulo}>Custo Fixo × Variável</Text>
            <LinhaResumo rotulo="Despesa Fixa" valor={relatorio.totalFixa} cor={CORES.laranja} />
            <LinhaResumo rotulo="Despesa Variável" valor={relatorio.totalVariavel} cor={CORES.vermelho} />
            <LinhaResumo rotulo="Investimento" valor={relatorio.totalInvestimento} cor={CORES.azul} />
            <LinhaResumo rotulo="Retirada do Proprietário" valor={relatorio.totalRetirada} cor={CORES.cinza} />
          </Cartao>

          <Cartao style={{ marginTop: 10 }}>
            <Text style={styles.subtitulo}>Receita por Serviço</Text>
            {relatorio.porServico.length === 0 && <Text style={styles.vazio}>Nenhuma entrada no mês.</Text>}
            {relatorio.porServico.map((s) => (
              <LinhaResumo key={s.servico} rotulo={`${s.servico} (${s.qtd}x)`} valor={s.total} cor={CORES.branco} />
            ))}
          </Cartao>

          <Cartao style={{ marginTop: 10 }}>
            <Text style={styles.subtitulo}>Receita por Veículo</Text>
            {relatorio.porVeiculo.map((v) => (
              <LinhaResumo key={v.veiculo} rotulo={`${v.veiculo} (${v.qtd}x)`} valor={v.total} cor={CORES.branco} />
            ))}
          </Cartao>

          <Cartao style={{ marginTop: 10 }}>
            <Text style={styles.subtitulo}>Receita por Pagamento</Text>
            {relatorio.porPagamento.map((p) => (
              <LinhaResumo key={p.forma_pagamento} rotulo={`${p.forma_pagamento} (${p.qtd}x)`} valor={p.total} cor={CORES.branco} />
            ))}
          </Cartao>

          <View style={{ marginTop: 16 }}>
            <Botao texto="📄 Exportar PDF Completo" onPress={exportarPdf} carregando={gerandoPdf} />
          </View>
        </>
      )}
    </ScrollView>
    </TelaAnimada>
  );
}

function LinhaResumo({ rotulo, valor, cor }) {
  return (
    <View style={styles.linhaResumo}>
      <Text style={styles.rotuloResumo}>{rotulo}</Text>
      <Text style={[styles.valorResumo, { color: cor }]}>{formatarMoeda(valor)}</Text>
    </View>
  );
}

function montarHtmlRelatorio(r) {
  const linhasTransacoes = r.registros
    .map((t) => {
      const detalhe = t.veiculo
        ? `${t.veiculo}${t.modelo ? " " + t.modelo : ""} • ${t.servico || ""}`
        : t.categoria_despesa || "-";
      const cor = t.tipo === "Entrada" ? "#22C55E" : t.tipo === "Despesa" ? "#EF4444" : "#F59E0B";
      return `<tr>
        <td>${t.data.split("-").reverse().join("/")}</td>
        <td style="color:${cor};font-weight:700">${t.tipo === "Saida" ? "Saída" : t.tipo}</td>
        <td>${t.cliente || t.descricao || "-"}</td>
        <td>${detalhe}</td>
        <td>${t.forma_pagamento || "-"}</td>
        <td>${t.status}</td>
        <td style="text-align:right">${formatarMoeda(t.valor)}</td>
      </tr>`;
    })
    .join("");

  return `
  <html>
  <head><meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
    h1 { color: #0064FE; margin-bottom: 0; }
    h2 { color: #0064FE; font-size: 15px; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th { background: #0064FE; color: white; padding: 6px; text-align: left; }
    td { padding: 6px; border-bottom: 1px solid #eee; }
    .resumo td { font-size: 13px; padding: 8px 0; }
  </style>
  </head>
  <body>
    <h1>BRABO STUDIO</h1>
    <p style="color:#555">Relatório Financeiro — ${MESES_PT[r.mes]} de ${r.ano}</p>

    <table class="resumo">
      <tr><td>Total de Entradas</td><td style="text-align:right;color:#22C55E">${formatarMoeda(r.resumo.Entrada)}</td></tr>
      <tr><td>Total de Despesas</td><td style="text-align:right;color:#EF4444">${formatarMoeda(r.resumo.Despesa)}</td></tr>
      <tr><td>Total de Saídas</td><td style="text-align:right;color:#F59E0B">${formatarMoeda(r.resumo.Saida)}</td></tr>
      <tr><td><b>Saldo Final</b></td><td style="text-align:right"><b>${formatarMoeda(r.resumo.saldo)}</b></td></tr>
    </table>

    <h2>Custo Fixo × Variável</h2>
    <table class="resumo">
      <tr><td>Despesa Fixa</td><td style="text-align:right">${formatarMoeda(r.totalFixa)}</td></tr>
      <tr><td>Despesa Variável</td><td style="text-align:right">${formatarMoeda(r.totalVariavel)}</td></tr>
      <tr><td>Investimento</td><td style="text-align:right">${formatarMoeda(r.totalInvestimento)}</td></tr>
      <tr><td>Retirada do Proprietário</td><td style="text-align:right">${formatarMoeda(r.totalRetirada)}</td></tr>
    </table>

    <h2>Todas as Transações do Mês (${r.registros.length})</h2>
    <table>
      <tr><th>Data</th><th>Tipo</th><th>Cliente/Descrição</th><th>Detalhe</th><th>Pagamento</th><th>Status</th><th>Valor</th></tr>
      ${linhasTransacoes}
    </table>

    <p style="color:#999;font-size:9px;margin-top:20px">Gerado pelo app mobile Brabo Studio.</p>
  </body>
  </html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.preto },
  titulo: { color: CORES.branco, fontSize: 20, fontWeight: "800", marginBottom: 14 },
  linhaSeletores: { flexDirection: "row", gap: 10 },
  subtituloRelatorio: { color: CORES.branco, fontSize: 16, fontWeight: "800", marginTop: 20, marginBottom: 10 },
  subtitulo: { color: CORES.azul, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  linhaCartoes: { flexDirection: "row", gap: 10, marginBottom: 10 },
  linhaResumo: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  rotuloResumo: { color: CORES.branco, fontSize: 13 },
  valorResumo: { fontSize: 13, fontWeight: "700" },
  vazio: { color: CORES.cinza, fontSize: 12 },
});
