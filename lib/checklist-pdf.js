import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { gruposDoVeiculo, ESTADOS, TEXTO_RODAPE_PDF } from "./checklist-itens";

// Identidade visual da Brabo (mesma do app)
const PRETO = rgb(0.02, 0.02, 0.024);
const AZUL = rgb(0, 0.392, 0.996);
const CINZA = rgb(0.45, 0.46, 0.5);
const CINZA_CLARO = rgb(0.92, 0.93, 0.95);
const TEXTO = rgb(0.1, 0.1, 0.12);
const VERDE = rgb(0.09, 0.64, 0.29);
const VERMELHO = rgb(0.86, 0.15, 0.15);
const BRANCO = rgb(1, 1, 1);

const LARGURA = 595.28;
const ALTURA = 841.89;
const MARGEM = 40;
const LARGURA_UTIL = LARGURA - MARGEM * 2;
const RODAPE = 46; // espaço reservado embaixo de cada página

function doisDigitos(n) {
  return String(n).padStart(2, "0");
}

export function formatarDataHora(data) {
  const d = data instanceof Date ? data : new Date(data);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()} ${doisDigitos(
    d.getHours()
  )}:${doisDigitos(d.getMinutes())}`;
}

function ehJpeg(bytes) {
  return bytes && bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}
function ehPng(bytes) {
  return bytes && bytes.length > 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

/**
 * Gera o PDF do checklist.
 * dados: { tipo_veiculo, cliente, whatsapp, modelo, placa, cor, km, combustivel, servico,
 *          sujeira, itens:{nome:{estado,obs}}, pertences, observacoes, criadoEm }
 * extras: { logoBytes: Uint8Array (png), fotos: Uint8Array[] (jpg/png) }
 * Retorna { bytes: Uint8Array, base64: string }
 */
export async function gerarPdfChecklist(dados, extras = {}) {
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const italico = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Standard fonts só aceitam o alfabeto "WinAnsi" — troca o que não couber por "?"
  const cacheChar = new Map();
  function limpar(texto) {
    let saida = "";
    for (const ch of String(texto ?? "").replace(/\r/g, "")) {
      if (ch === "\n") {
        saida += ch;
        continue;
      }
      if (!cacheChar.has(ch)) {
        let valido = true;
        try {
          fonte.encodeText(ch);
        } catch {
          valido = false;
        }
        cacheChar.set(ch, valido);
      }
      saida += cacheChar.get(ch) ? ch : "?";
    }
    return saida;
  }

  function quebrarLinhas(texto, fnt, tamanho, larguraMax) {
    const resultado = [];
    for (const paragrafo of limpar(texto).split("\n")) {
      const palavras = paragrafo.split(/\s+/).filter(Boolean);
      if (palavras.length === 0) {
        resultado.push("");
        continue;
      }
      let linha = "";
      for (const palavra of palavras) {
        const tentativa = linha ? `${linha} ${palavra}` : palavra;
        if (fnt.widthOfTextAtSize(tentativa, tamanho) <= larguraMax) {
          linha = tentativa;
        } else {
          if (linha) resultado.push(linha);
          // palavra gigante: corta
          let resto = palavra;
          while (fnt.widthOfTextAtSize(resto, tamanho) > larguraMax) {
            let n = resto.length;
            while (n > 1 && fnt.widthOfTextAtSize(resto.slice(0, n), tamanho) > larguraMax) n--;
            resultado.push(resto.slice(0, n));
            resto = resto.slice(n);
          }
          linha = resto;
        }
      }
      if (linha) resultado.push(linha);
    }
    return resultado;
  }

  let logo = null;
  if (extras.logoBytes) {
    try {
      logo = await doc.embedPng(extras.logoBytes);
    } catch {
      logo = null;
    }
  }

  let pagina = null;
  let y = 0;

  function desenharCabecalhoCompleto(pg) {
    const altura = 92;
    pg.drawRectangle({ x: 0, y: ALTURA - altura, width: LARGURA, height: altura, color: PRETO });
    pg.drawRectangle({ x: 0, y: ALTURA - altura - 3, width: LARGURA, height: 3, color: AZUL });
    if (logo) {
      const h = 44;
      const w = (logo.width / logo.height) * h;
      pg.drawImage(logo, { x: MARGEM, y: ALTURA - altura / 2 - h / 2, width: w, height: h });
    } else {
      pg.drawText("BRABO STUDIO", { x: MARGEM, y: ALTURA - 56, size: 24, font: negrito, color: BRANCO });
    }
    const titulo = "CHECKLIST DE ENTRADA";
    pg.drawText(titulo, {
      x: LARGURA - MARGEM - negrito.widthOfTextAtSize(titulo, 15),
      y: ALTURA - 42,
      size: 15,
      font: negrito,
      color: BRANCO,
    });
    const sub = limpar(`${dados.tipo_veiculo || ""}  |  ${formatarDataHora(dados.criadoEm || new Date())}`);
    pg.drawText(sub, {
      x: LARGURA - MARGEM - fonte.widthOfTextAtSize(sub, 10),
      y: ALTURA - 60,
      size: 10,
      font: fonte,
      color: rgb(0.7, 0.72, 0.78),
    });
    return ALTURA - altura - 3 - 22;
  }

  function novaPagina(primeira = false) {
    pagina = doc.addPage([LARGURA, ALTURA]);
    if (primeira) {
      y = desenharCabecalhoCompleto(pagina);
    } else {
      pagina.drawRectangle({ x: 0, y: ALTURA - 8, width: LARGURA, height: 8, color: PRETO });
      pagina.drawRectangle({ x: 0, y: ALTURA - 10, width: LARGURA, height: 2, color: AZUL });
      y = ALTURA - 36;
    }
  }

  function garantirEspaco(altura) {
    if (y - altura < RODAPE) novaPagina(false);
  }

  function titulo(texto) {
    garantirEspaco(34);
    y -= 6;
    pagina.drawRectangle({ x: MARGEM, y: y - 3, width: 4, height: 15, color: AZUL });
    pagina.drawText(limpar(texto.toUpperCase()), { x: MARGEM + 11, y, size: 11.5, font: negrito, color: TEXTO });
    y -= 20;
  }

  function paragrafo(texto, { tamanho = 10, fnt = fonte, cor = TEXTO, recuo = 0 } = {}) {
    const linhas = quebrarLinhas(texto, fnt, tamanho, LARGURA_UTIL - recuo);
    for (const linha of linhas) {
      garantirEspaco(tamanho + 6);
      pagina.drawText(linha, { x: MARGEM + recuo, y, size: tamanho, font: fnt, color: cor });
      y -= tamanho + 4;
    }
  }

  // ---------------------------------------------------------------- PÁGINA 1
  novaPagina(true);

  // Dados do cliente / veículo em 2 colunas
  titulo("Cliente e veículo");
  const campos = [
    ["Cliente", dados.cliente],
    ["WhatsApp", dados.whatsapp],
    [dados.tipo_veiculo === "Moto" ? "Moto" : "Veículo", dados.modelo],
    ["Placa", dados.placa],
    ["Cor", dados.cor],
    ["Quilometragem", dados.km ? `${dados.km} km` : ""],
    ["Combustível", dados.combustivel],
    ["Serviço", dados.servico],
    ["Nível de sujeira", dados.sujeira],
  ];
  const colunaLargura = LARGURA_UTIL / 2;
  for (let i = 0; i < campos.length; i += 2) {
    garantirEspaco(32);
    for (let c = 0; c < 2; c++) {
      const item = campos[i + c];
      if (!item) continue;
      const x = MARGEM + c * colunaLargura;
      pagina.drawText(limpar(item[0]), { x, y, size: 8, font: negrito, color: CINZA });
      const valor = limpar(item[1] || "—");
      const linhas = quebrarLinhas(valor, fonte, 11, colunaLargura - 14);
      pagina.drawText(linhas[0] || "—", { x, y: y - 13, size: 11, font: fonte, color: TEXTO });
    }
    y -= 32;
  }

  // Grupos de itens
  const grupos = gruposDoVeiculo(dados.tipo_veiculo);
  const itens = dados.itens || {};
  let totalAvarias = 0;
  for (const g of grupos) for (const nome of g.itens) if (itens[nome]?.estado === "avaria") totalAvarias++;

  for (const grupo of grupos) {
    titulo(grupo.titulo);
    let zebra = false;
    for (const nome of grupo.itens) {
      const info = itens[nome] || { estado: "ok", obs: "" };
      const obsLinhas = info.obs ? quebrarLinhas(info.obs, italico, 9, LARGURA_UTIL - 24 - 90) : [];
      const alturaLinha = 20 + obsLinhas.length * 12;
      garantirEspaco(alturaLinha + 2);

      if (zebra) {
        pagina.drawRectangle({
          x: MARGEM,
          y: y - alturaLinha + 14,
          width: LARGURA_UTIL,
          height: alturaLinha,
          color: CINZA_CLARO,
        });
      }
      zebra = !zebra;

      pagina.drawText(limpar(nome), { x: MARGEM + 8, y, size: 10.5, font: fonte, color: TEXTO });

      const estado = info.estado || "ok";
      const rotulo = ESTADOS[estado] || "OK";
      const cor = estado === "avaria" ? VERMELHO : estado === "na" ? CINZA : VERDE;
      const larguraRotulo = negrito.widthOfTextAtSize(rotulo, 10);
      const caixaW = Math.max(46, larguraRotulo + 18);
      const caixaX = LARGURA - MARGEM - caixaW - 6;
      pagina.drawRectangle({
        x: caixaX,
        y: y - 4,
        width: caixaW,
        height: 16,
        color: estado === "avaria" ? rgb(0.99, 0.9, 0.9) : estado === "na" ? rgb(0.9, 0.9, 0.92) : rgb(0.88, 0.97, 0.91),
        borderColor: cor,
        borderWidth: 0.8,
      });
      pagina.drawText(rotulo, { x: caixaX + (caixaW - larguraRotulo) / 2, y: y + 0.5, size: 10, font: negrito, color: cor });

      let yObs = y - 13;
      for (const l of obsLinhas) {
        pagina.drawText(l, { x: MARGEM + 20, y: yObs, size: 9, font: italico, color: CINZA });
        yObs -= 12;
      }
      y -= alturaLinha;
    }
  }

  // Pertences e observações
  if (dados.pertences && dados.pertences.trim()) {
    titulo("Pertences deixados no veículo");
    paragrafo(dados.pertences);
  }
  if (dados.observacoes && dados.observacoes.trim()) {
    titulo("Observações gerais");
    paragrafo(dados.observacoes);
  }

  // Resumo
  titulo("Resumo");
  paragrafo(
    totalAvarias === 0
      ? "Nenhuma avaria registrada na entrada."
      : `${totalAvarias} ponto(s) com avaria registrado(s) na entrada (detalhes acima).`,
    { fnt: negrito, cor: totalAvarias === 0 ? VERDE : VERMELHO, tamanho: 10.5 }
  );
  y -= 4;
  paragrafo(TEXTO_RODAPE_PDF, { fnt: italico, cor: CINZA, tamanho: 9 });

  // ---------------------------------------------------------------- FOTOS
  const fotos = (extras.fotos || []).filter(Boolean);
  if (fotos.length > 0) {
    novaPagina(false);
    titulo("Fotos do veículo");
    const gap = 12;
    const caixaW = (LARGURA_UTIL - gap) / 2;
    const caixaH = 200;
    let coluna = 0;
    for (const bytes of fotos) {
      let img = null;
      try {
        if (ehJpeg(bytes)) img = await doc.embedJpg(bytes);
        else if (ehPng(bytes)) img = await doc.embedPng(bytes);
      } catch {
        img = null;
      }
      if (!img) continue;

      if (coluna === 0) garantirEspaco(caixaH + 12);
      const escala = Math.min(caixaW / img.width, caixaH / img.height);
      const w = img.width * escala;
      const h = img.height * escala;
      const x = MARGEM + coluna * (caixaW + gap);
      pagina.drawRectangle({ x, y: y - caixaH, width: caixaW, height: caixaH, color: CINZA_CLARO });
      pagina.drawImage(img, { x: x + (caixaW - w) / 2, y: y - caixaH + (caixaH - h) / 2, width: w, height: h });

      coluna++;
      if (coluna === 2) {
        coluna = 0;
        y -= caixaH + gap;
      }
    }
  }

  // ---------------------------------------------------------------- RODAPÉ
  const paginas = doc.getPages();
  paginas.forEach((pg, i) => {
    pg.drawLine({
      start: { x: MARGEM, y: 34 },
      end: { x: LARGURA - MARGEM, y: 34 },
      thickness: 0.6,
      color: rgb(0.8, 0.82, 0.86),
    });
    pg.drawText("Brabo Studio  |  Estética automotiva", { x: MARGEM, y: 20, size: 8.5, font: fonte, color: CINZA });
    const num = `Página ${i + 1} de ${paginas.length}`;
    pg.drawText(num, {
      x: LARGURA - MARGEM - fonte.widthOfTextAtSize(num, 8.5),
      y: 20,
      size: 8.5,
      font: fonte,
      color: CINZA,
    });
  });

  doc.setTitle(limpar(`Checklist de entrada - ${dados.cliente || "cliente"}`));
  doc.setAuthor("Brabo Studio");

  const bytes = await doc.save();
  // base64 só é usado no celular nativo (pra gravar o arquivo). Gerado sob demanda
  // pra não serializar o PDF duas vezes e pesar na memória do navegador.
  let base64Cache = null;
  return {
    bytes,
    get base64() {
      if (base64Cache === null) {
        let bin = "";
        const passo = 0x8000;
        for (let i = 0; i < bytes.length; i += passo) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
        }
        base64Cache = btoa(bin);
      }
      return base64Cache;
    },
  };
}
