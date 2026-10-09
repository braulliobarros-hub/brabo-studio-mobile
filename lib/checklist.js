import { Platform } from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase } from "./supabase";
import { obterUrlFoto } from "./fotos";
import { gerarPdfChecklist } from "./checklist-pdf";

const BUCKET = "fotos-clientes";

async function lerBytes(uri) {
  const resp = await fetch(uri);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

async function carregarLogo() {
  const asset = Asset.fromModule(require("../assets/logo.png"));
  if (!asset.localUri) await asset.downloadAsync();
  return lerBytes(asset.localUri || asset.uri);
}

/** Gera o PDF a partir dos dados e das fotos (uris locais ou bytes). */
export async function montarPdf(dados, fotos = []) {
  const logoBytes = await carregarLogo();
  const fotosBytes = [];
  for (const f of fotos) {
    try {
      fotosBytes.push(f instanceof Uint8Array ? f : await lerBytes(f));
    } catch (e) {
      console.warn("Foto ignorada no PDF:", e.message);
    }
  }
  return gerarPdfChecklist(dados, { logoBytes, fotos: fotosBytes });
}

/** Salva o checklist no Supabase e sobe as fotos. Retorna a linha salva. */
export async function salvarChecklist(userId, dados, fotosUris = []) {
  const caminhos = [];
  const stamp = Date.now();
  for (let i = 0; i < fotosUris.length; i++) {
    try {
      const bytes = await lerBytes(fotosUris[i]);
      const caminho = `${userId}/checklists/${stamp}_${i + 1}.jpg`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      caminhos.push(caminho);
    } catch (e) {
      console.warn("Falha ao subir foto do checklist:", e.message);
    }
  }

  const { data, error } = await supabase
    .from("checklists")
    .insert({
      tipo_veiculo: dados.tipo_veiculo,
      cliente: dados.cliente,
      whatsapp: dados.whatsapp,
      modelo: dados.modelo,
      placa: dados.placa,
      cor: dados.cor,
      km: dados.km,
      combustivel: dados.combustivel,
      servico: dados.servico,
      sujeira: dados.sujeira,
      itens: dados.itens,
      pertences: dados.pertences,
      observacoes: dados.observacoes,
      fotos: caminhos,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarChecklistsRecentes(limite = 15) {
  const { data, error } = await supabase
    .from("checklists")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data || [];
}

/** Converte uma linha do banco de volta nos dados que o PDF espera + bytes das fotos. */
export async function dadosParaPdf(linha) {
  const fotos = [];
  for (const caminho of linha.fotos || []) {
    try {
      const url = await obterUrlFoto(caminho);
      if (url) fotos.push(await lerBytes(url));
    } catch (e) {
      console.warn("Foto não carregada:", e.message);
    }
  }
  return {
    dados: { ...linha, criadoEm: new Date(linha.criado_em) },
    fotos,
  };
}

export function nomeArquivoPdf(dados) {
  const base = `checklist_${(dados.placa || dados.cliente || "veiculo")}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base}.pdf`;
}

function numeroWhatsapp(whatsapp) {
  let n = (whatsapp || "").replace(/\D/g, "");
  if (n && n.length <= 11) n = "55" + n;
  return n;
}

export function linkWhatsapp(whatsapp, mensagem) {
  return `https://wa.me/${numeroWhatsapp(whatsapp)}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemPadrao(dados) {
  const nome = (dados.cliente || "").split(" ")[0];
  return `Olá${nome ? ", " + nome : ""}! Segue o checklist de entrada do seu ${
    dados.tipo_veiculo === "Moto" ? "moto" : "veículo"
  }${dados.modelo ? " (" + dados.modelo + ")" : ""}. Brabo Studio.`;
}

function baixarWeb(bytes, nome) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Abre a folha de compartilhar com o PDF anexado (o usuário escolhe o WhatsApp).
 * Onde não der pra anexar (PC), baixa o PDF e abre a conversa do cliente no WhatsApp.
 * Retorna "compartilhado" | "baixado".
 */
export async function enviarPdf({ bytes, base64 }, dados) {
  const nome = nomeArquivoPdf(dados);
  const mensagem = mensagemPadrao(dados);

  if (Platform.OS === "web") {
    const file = new File([bytes], nome, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Checklist Brabo Studio", text: mensagem });
        return "compartilhado";
      } catch (e) {
        if (e && e.name === "AbortError") return "compartilhado";
      }
    }
    baixarWeb(bytes, nome);
    if (dados.whatsapp) window.open(linkWhatsapp(dados.whatsapp, mensagem), "_blank");
    return "baixado";
  }

  const caminho = FileSystem.cacheDirectory + nome;
  await FileSystem.writeAsStringAsync(caminho, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(caminho, {
    mimeType: "application/pdf",
    dialogTitle: "Enviar checklist",
    UTI: "com.adobe.pdf",
  });
  return "compartilhado";
}

export async function baixarPdf({ bytes, base64 }, dados) {
  const nome = nomeArquivoPdf(dados);
  if (Platform.OS === "web") {
    baixarWeb(bytes, nome);
    return;
  }
  await enviarPdf({ bytes, base64 }, dados);
}
