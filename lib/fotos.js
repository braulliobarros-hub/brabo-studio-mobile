import { supabase } from "./supabase";

const BUCKET = "fotos-clientes";

export function chaveCliente(cliente, whatsapp) {
  const nome = (cliente || "").trim().toLowerCase();
  const wpp = (whatsapp || "").trim();
  return `${nome}|${wpp}`;
}

function nomeArquivoSanitizado(cliente, whatsapp) {
  const base = (cliente || "cliente")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const numero = (whatsapp || "").replace(/\D/g, "");
  return `${base}_${numero}`.replace(/^_+|_+$/g, "") || "cliente";
}

/**
 * Envia a foto (uri local do celular) pro Storage e registra o caminho
 * na tabela clientes_fotos. Retorna o caminho salvo dentro do bucket.
 */
export async function enviarFotoCliente(userId, cliente, whatsapp, uriLocal) {
  const resposta = await fetch(uriLocal);
  const blob = await resposta.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const nomeArquivo = nomeArquivoSanitizado(cliente, whatsapp);
  const caminho = `${userId}/${nomeArquivo}.jpg`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (erroUpload) throw erroUpload;

  const chave = chaveCliente(cliente, whatsapp);
  const { error: erroTabela } = await supabase.from("clientes_fotos").upsert({
    chave,
    user_id: userId,
    cliente,
    whatsapp,
    caminho_foto: caminho,
  });
  if (erroTabela) throw erroTabela;

  return caminho;
}

export async function removerFotoCliente(cliente, whatsapp) {
  const chave = chaveCliente(cliente, whatsapp);
  const { error } = await supabase
    .from("clientes_fotos")
    .delete()
    .eq("chave", chave);
  if (error) throw error;
}

/** Gera uma URL temporária (1h) pra exibir a foto, já que o bucket é privado. */
export async function obterUrlFoto(caminhoFoto) {
  if (!caminhoFoto) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminhoFoto, 3600);
  if (error) return null;
  return data.signedUrl;
}

/** Busca o caminho da foto já cadastrada de um cliente (ou null). */
export async function buscarFotoCliente(cliente, whatsapp) {
  const chave = chaveCliente(cliente, whatsapp);
  const { data } = await supabase
    .from("clientes_fotos")
    .select("caminho_foto")
    .eq("chave", chave)
    .maybeSingle();
  return data?.caminho_foto || null;
}
