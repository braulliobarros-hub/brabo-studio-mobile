import { supabase } from "./supabase";

/** Retorna "AAAA-MM-01" do mês seguinte ao prefixo dado ("AAAA-MM") — usado como
 *  limite exclusivo pra fechar o intervalo do mês sem depender de "dia 31" fixo,
 *  que quebra em meses com menos dias (bug corrigido: date/time field out of range). */
function proximoMesIso(prefixo) {
  const [ano, mes] = prefixo.split("-").map(Number);
  const novoMes = mes === 12 ? 1 : mes + 1;
  const novoAno = mes === 12 ? ano + 1 : ano;
  return `${novoAno}-${String(novoMes).padStart(2, "0")}-01`;
}

// ---------------------------------------------------------------- TRANSAÇÕES

export async function adicionarTransacao(dados) {
  const { data, error } = await supabase
    .from("transacoes")
    .insert(dados)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarTransacao(id, dados) {
  const { error } = await supabase.from("transacoes").update(dados).eq("id", id);
  if (error) throw error;
}

export async function excluirTransacao(id) {
  const { error } = await supabase.from("transacoes").delete().eq("id", id);
  if (error) throw error;
}

/**
 * filtros: { tipo, veiculo, servico, status, formaPagamento, mes: "AAAA-MM" }
 */
export async function buscarTransacoes(filtros = {}) {
  let query = supabase.from("transacoes").select("*").order("data", { ascending: false }).order("id", { ascending: false });

  if (filtros.tipo && filtros.tipo !== "Todos") query = query.eq("tipo", filtros.tipo);
  if (filtros.veiculo && filtros.veiculo !== "Todos") query = query.eq("veiculo", filtros.veiculo);
  if (filtros.servico && filtros.servico !== "Todos") query = query.eq("servico", filtros.servico);
  if (filtros.status && filtros.status !== "Todos") query = query.eq("status", filtros.status);
  if (filtros.formaPagamento && filtros.formaPagamento !== "Todos")
    query = query.eq("forma_pagamento", filtros.formaPagamento);
  if (filtros.mes) {
    query = query.gte("data", `${filtros.mes}-01`).lt("data", proximoMesIso(filtros.mes));
  }
  if (filtros.dataInicio) query = query.gte("data", filtros.dataInicio);
  if (filtros.dataFim) query = query.lte("data", filtros.dataFim);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------- RESUMOS

export async function resumoMes(ano, mes) {
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("transacoes")
    .select("tipo, valor")
    .eq("status", "Pago")
    .gte("data", `${prefixo}-01`)
    .lt("data", proximoMesIso(prefixo));
  if (error) throw error;

  const resultado = { Entrada: 0, Despesa: 0, Saida: 0 };
  for (const linha of data) {
    resultado[linha.tipo] = (resultado[linha.tipo] || 0) + Number(linha.valor);
  }
  resultado.saldo = resultado.Entrada - resultado.Despesa - resultado.Saida;
  return resultado;
}

export async function ultimosNMeses(n = 6) {
  const hoje = new Date();
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    lista.push({ ano: d.getFullYear(), mes: d.getMonth() + 1 });
  }
  const resultados = [];
  for (const { ano, mes } of lista) {
    const r = await resumoMes(ano, mes);
    resultados.push({ ano, mes, ...r });
  }
  return resultados;
}

async function agruparEntradasPago(campo, ano, mes) {
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("transacoes")
    .select(`${campo}, valor`)
    .eq("tipo", "Entrada")
    .eq("status", "Pago")
    .not(campo, "is", null)
    .gte("data", `${prefixo}-01`)
    .lt("data", proximoMesIso(prefixo));
  if (error) throw error;

  const grupos = {};
  for (const linha of data) {
    const chave = linha[campo];
    if (!grupos[chave]) grupos[chave] = { qtd: 0, total: 0 };
    grupos[chave].qtd += 1;
    grupos[chave].total += Number(linha.valor);
  }
  return Object.entries(grupos).map(([chave, v]) => ({ [campo]: chave, ...v }));
}

export const resumoPorServico = (ano, mes) => agruparEntradasPago("servico", ano, mes);
export const resumoPorVeiculo = (ano, mes) => agruparEntradasPago("veiculo", ano, mes);
export const resumoPorPagamento = (ano, mes) => agruparEntradasPago("forma_pagamento", ano, mes);

export async function resumoPorCategoria(ano, mes) {
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("transacoes")
    .select("categoria_despesa, valor")
    .in("tipo", ["Despesa", "Saida"])
    .eq("status", "Pago")
    .not("categoria_despesa", "is", null)
    .gte("data", `${prefixo}-01`)
    .lt("data", proximoMesIso(prefixo));
  if (error) throw error;

  const grupos = {};
  for (const linha of data) {
    const chave = linha.categoria_despesa;
    grupos[chave] = (grupos[chave] || 0) + Number(linha.valor);
  }
  return grupos;
}

export async function pendenciasEmAberto() {
  const { data, error } = await supabase
    .from("transacoes")
    .select("*")
    .eq("status", "Pendente")
    .order("prazo", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function mesesDisponiveis() {
  const { data, error } = await supabase.from("transacoes").select("data");
  if (error) throw error;
  const meses = new Set(data.map((r) => r.data.substring(0, 7)));
  return Array.from(meses).sort().reverse();
}

// ---------------------------------------------------------------- CLIENTES

export async function listarClientesDetalhado() {
  const { data, error } = await supabase
    .from("transacoes")
    .select("cliente, whatsapp, veiculo, modelo, servico, data")
    .eq("tipo", "Entrada")
    .not("cliente", "is", null)
    .order("data", { ascending: false });
  if (error) throw error;

  const porCliente = {};
  for (const linha of data) {
    const chave = (linha.cliente || "").trim().toLowerCase();
    if (!chave) continue;
    if (!porCliente[chave]) {
      porCliente[chave] = { ...linha, ultimaData: linha.data };
    }
  }
  return Object.values(porCliente).sort((a, b) =>
    (a.cliente || "").localeCompare(b.cliente || "")
  );
}

// ---------------------------------------------------------------- LEMBRETES

export async function clientesParaLembrete() {
  const clientes = await listarClientesDetalhado();
  const { data: confirmados, error } = await supabase
    .from("lembretes_confirmados")
    .select("chave, intervalo_confirmado");
  if (error) throw error;
  const mapaConfirmados = Object.fromEntries(
    confirmados.map((c) => [c.chave, c.intervalo_confirmado])
  );

  const hoje = new Date();
  const resultado = [];
  for (const c of clientes) {
    const dataUltima = new Date(c.ultimaData + "T00:00:00");
    const diasPassados = Math.floor((hoje - dataUltima) / (1000 * 60 * 60 * 24));
    const intervaloAtual = Math.floor(diasPassados / 15);
    if (intervaloAtual < 1) continue;

    const chave = `${(c.cliente || "").trim().toLowerCase()}|${(c.whatsapp || "").trim()}`;
    const intervaloConfirmado = mapaConfirmados[chave] || 0;
    if (intervaloAtual > intervaloConfirmado) {
      resultado.push({ ...c, diasPassados, intervaloAtual, chave });
    }
  }
  return resultado.sort((a, b) => b.diasPassados - a.diasPassados);
}

export async function confirmarLembrete(chave, cliente, whatsapp, intervalo) {
  const { error } = await supabase.from("lembretes_confirmados").upsert({
    chave,
    cliente,
    whatsapp,
    intervalo_confirmado: intervalo,
  });
  if (error) throw error;
}
