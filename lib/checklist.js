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

const LADO_MAX_FOTO = 1280;

/**
 * Na web, o celular entrega a foto original (12MP, 4-8MB, às vezes PNG).
 * Embutir 6 dessas no PDF estoura a memória da aba e o navegador recarrega
 * a página (os campos zeram e o PDF não sai). Aqui a foto é reduzida pra
 * no máximo 1280px em JPEG antes de ir pro PDF e pro Storage.
 * Retorna uma uri nova (blob:) — no celular nativo devolve a mesma uri.
 */
export async function prepararFoto(uri) {
  if (Platform.OS !== "web") return uri;
  const img = await new Promise((resolve, reject) => {
    const i = new window.Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Não consegui ler a foto"));
    i.src = uri;
  });
  const escala = Math.min(1, LADO_MAX_FOTO / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * escala));
  const h = Math.max(1, Math.round(img.naturalHeight * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao comprimir a foto"))), "image/jpeg", 0.75)
  );
  canvas.width = 0;
  canvas.height = 0;
  if (uri.startsWith("blob:")) URL.revokeObjectURL(uri);
  return URL.createObjectURL(blob);
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

async function subirFotos(userId, fotosUris) {
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
  return caminhos;
}

function colunas(dados) {
  return {
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
  };
}

/** Salva o checklist no Supabase e sobe as fotos. Retorna a linha salva. */
export async function salvarChecklist(userId, dados, fotosUris = []) {
  const caminhos = await subirFotos(userId, fotosUris);
  const { data, error } = await supabase
    .from("checklists")
    .insert({ ...colunas(dados), fotos: caminhos })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Atualiza um checklist já salvo.
 * fotosMantidas: caminhos (no Storage) das fotos antigas que continuam.
 * fotosRemovidas: caminhos das fotos antigas que saíram (são apagadas do Storage).
 * novasUris: fotos novas adicionadas na edição.
 */
export async function atualizarChecklist(id, userId, dados, fotosMantidas = [], fotosRemovidas = [], novasUris = []) {
  const novos = await subirFotos(userId, novasUris);
  const { data, error } = await supabase
    .from("checklists")
    .update({ ...colunas(dados), fotos: [...fotosMantidas, ...novos] })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await apagarFotos(fotosRemovidas);
  return data;
}

async function apagarFotos(caminhos) {
  if (!caminhos || caminhos.length === 0) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove(caminhos);
    if (error) throw error;
  } catch (e) {
    // Não trava a operação se a foto não sair do Storage.
    console.warn("Não consegui apagar fotos do checklist:", e.message);
  }
}

/** Exclui o checklist e as fotos dele. */
export async function excluirChecklist(linha) {
  const { error } = await supabase.from("checklists").delete().eq("id", linha.id);
  if (error) throw error;
  await apagarFotos(linha.fotos || []);
}

/** URLs das fotos salvas, pra mostrar na tela ao editar. */
export async function urlsDasFotos(caminhos = []) {
  const lista = [];
  for (const caminho of caminhos) {
    try {
      const url = await obterUrlFoto(caminho);
      if (url) lista.push({ caminho, url });
    } catch (e) {
      console.warn("Foto não carregada:", e.message);
    }
  }
  return lista;
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
export async function enviarPdf(pdf, dados) {
  const { bytes } = pdf;
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
  await FileSystem.writeAsStringAsync(caminho, pdf.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(caminho, {
    mimeType: "application/pdf",
    dialogTitle: "Enviar checklist",
    UTI: "com.adobe.pdf",
  });
  return "compartilhado";
}

/**
 * Abre o PDF pra visualizar. Na web, passe uma janela já aberta no clique
 * (senão o navegador bloqueia o pop-up, porque o PDF demora a ser gerado).
 */
export async function abrirPdf(pdf, dados, janela) {
  const { bytes } = pdf;
  if (Platform.OS === "web") {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    if (janela && !janela.closed) janela.location.href = url;
    else if (!window.open(url, "_blank")) baixarWeb(bytes, nomeArquivoPdf(dados));
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  // No celular, a folha de compartilhar já mostra a prévia do PDF.
  await enviarPdf(pdf, dados);
}

export async function baixarPdf(pdf, dados) {
  const { bytes } = pdf;
  const nome = nomeArquivoPdf(dados);
  if (Platform.OS === "web") {
    baixarWeb(bytes, nome);
    return;
  }
  await enviarPdf(pdf, dados);
}
