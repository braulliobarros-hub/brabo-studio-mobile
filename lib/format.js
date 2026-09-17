export function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function dataIsoParaBr(dataIso) {
  if (!dataIso) return "";
  const [ano, mes, dia] = dataIso.split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

export function dataBrParaIso(dataBr) {
  const partes = (dataBr || "").trim().split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  if (!dia || !mes || !ano) return null;
  const d = dia.padStart(2, "0");
  const m = mes.padStart(2, "0");
  if (ano.length !== 4) return null;
  return `${ano}-${m}-${d}`;
}

export function dataHojeIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function dataHojeBr() {
  return dataIsoParaBr(dataHojeIso());
}

export const MESES_PT = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function somarMeses(dataIso, quantidade) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  data.setMonth(data.getMonth() + quantidade);
  const novoAno = data.getFullYear();
  const novoMes = String(data.getMonth() + 1).padStart(2, "0");
  const novoDia = String(data.getDate()).padStart(2, "0");
  return `${novoAno}-${novoMes}-${novoDia}`;
}
