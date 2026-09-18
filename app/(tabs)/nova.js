import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CORES } from "../../lib/theme";
import { Cartao, Botao, Campo, Seletor, TelaAnimada } from "../../lib/ui";
import { CampoData } from "../../lib/CampoData";
import { alertar } from "../../lib/alerta";
import {
  formatarMoeda,
  dataHojeIso,
  dataIsoParaBr,
  somarMeses,
} from "../../lib/format";
import {
  FORMAS_PAGAMENTO,
  CATEGORIAS_DESPESA,
  SERVICOS_CARRO,
  SERVICOS_MOTO,
  MODELOS_CARRO,
  MODELOS_MOTO,
} from "../../lib/constants";
import { adicionarTransacao, listarClientesDetalhado } from "../../lib/queries";
import { enviarFotoCliente, buscarFotoCliente, obterUrlFoto } from "../../lib/fotos";
import { useAuth } from "../../lib/auth-context";

const TIPOS = ["Entrada", "Despesa", "Saida"];
const PARCELAS_OPCOES = Array.from({ length: 10 }, (_, i) => `${i + 1}x`);

export default function NovaTransacao() {
  const { usuario } = useAuth();

  const [tipo, setTipo] = useState("Entrada");
  const [dataIso, setDataIso] = useState(dataHojeIso());
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("Pago");
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [parcelas, setParcelas] = useState("1x");

  const [veiculo, setVeiculo] = useState("Carro");
  const [modelo, setModelo] = useState("");
  const [servico, setServico] = useState(SERVICOS_CARRO[0]);
  const [categoria, setCategoria] = useState(CATEGORIAS_DESPESA[0]);

  const [cliente, setCliente] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const clientesCache = useRef(null);

  const [prazoIso, setPrazoIso] = useState("");
  const [descricao, setDescricao] = useState("");

  const [fotoUri, setFotoUri] = useState(null); // uri local escolhida agora
  const [fotoExistenteUrl, setFotoExistenteUrl] = useState(null); // preview de foto já salva

  const [salvando, setSalvando] = useState(false);

  const servicosDisponiveis = veiculo === "Moto" ? SERVICOS_MOTO : SERVICOS_CARRO;
  const modelosDisponiveis = veiculo === "Moto" ? MODELOS_MOTO : MODELOS_CARRO;
  const statusOpcoes = tipo === "Entrada" ? ["Pago", "Parcialmente Pago", "Pendente"] : ["Pago", "Pendente"];

  function limparFormulario() {
    setTipo("Entrada");
    setDataIso(dataHojeIso());
    setValor("");
    setStatus("Pago");
    setFormaPagamento("Pix");
    setParcelas("1x");
    setVeiculo("Carro");
    setModelo("");
    setServico(SERVICOS_CARRO[0]);
    setCategoria(CATEGORIAS_DESPESA[0]);
    setCliente("");
    setWhatsapp("");
    setPrazoIso("");
    setDescricao("");
    setFotoUri(null);
    setFotoExistenteUrl(null);
    setSugestoes([]);
    setMostrarSugestoes(false);
  }

  async function aoMudarCliente(texto) {
    setCliente(texto);
    setFotoUri(null);
    setFotoExistenteUrl(null);

    if (!clientesCache.current) {
      try {
        clientesCache.current = await listarClientesDetalhado();
      } catch {
        clientesCache.current = [];
      }
    }
    if (texto.trim().length < 1) {
      setSugestoes([]);
      setMostrarSugestoes(false);
      return;
    }
    const filtrados = clientesCache.current.filter((c) =>
      (c.cliente || "").toLowerCase().includes(texto.toLowerCase())
    );
    setSugestoes(filtrados.slice(0, 6));
    setMostrarSugestoes(filtrados.length > 0);
  }

  async function selecionarSugestao(c) {
    setCliente(c.cliente);
    setWhatsapp(c.whatsapp || "");
    setMostrarSugestoes(false);
    try {
      const caminho = await buscarFotoCliente(c.cliente, c.whatsapp);
      if (caminho) {
        const url = await obterUrlFoto(caminho);
        setFotoExistenteUrl(url);
      }
    } catch {
      // sem foto, sem problema
    }
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      alertar("Permissão necessária", "Preciso de acesso às fotos pra continuar.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!resultado.canceled) {
      setFotoUri(resultado.assets[0].uri);
      setFotoExistenteUrl(null);
    }
  }

  function calcularValorNumerico() {
    const limpo = valor.replace(/\./g, "").replace(",", ".");
    const numero = parseFloat(limpo);
    return isNaN(numero) ? parseFloat(valor) : numero;
  }

  async function salvar() {
    if (!dataIso) {
      alertar("Data inválida", "Escolhe uma data válida.");
      return;
    }
    const valorNumerico = calcularValorNumerico();
    if (!valorNumerico || valorNumerico <= 0) {
      alertar("Valor inválido", "Digita um valor válido, maior que zero.");
      return;
    }

    setSalvando(true);
    try {
      const base = {
        tipo,
        data: dataIso,
        valor: valorNumerico,
        forma_pagamento: formaPagamento,
        prazo: prazoIso || null,
        descricao: descricao.trim() || null,
      };

      if (tipo === "Entrada") {
        base.veiculo = veiculo;
        base.modelo = modelo.trim() || null;
        base.servico = servico;
        base.cliente = cliente.trim() || null;
        base.whatsapp = whatsapp.trim() || null;
      } else {
        base.categoria_despesa = categoria;
      }

      const numParcelas = parseInt(parcelas.replace("x", ""), 10);
      const usaParcelas =
        (tipo === "Despesa" || tipo === "Saida") &&
        formaPagamento === "Cartão" &&
        numParcelas > 1;

      if (usaParcelas) {
        const valorBase = Math.round((valorNumerico / numParcelas) * 100) / 100;
        const valorUltima = Math.round((valorNumerico - valorBase * (numParcelas - 1)) * 100) / 100;
        for (let i = 1; i <= numParcelas; i++) {
          const dataParcela = somarMeses(dataIso, i - 1);
          await adicionarTransacao({
            ...base,
            valor: i < numParcelas ? valorBase : valorUltima,
            data: dataParcela,
            descricao: `${descricao.trim() || ""} (Parcela ${i}/${numParcelas})`.trim(),
            status: i === 1 ? status : "Pendente",
            prazo: i === 1 ? base.prazo : dataParcela,
          });
        }
        alertar("Parcelas registradas", `${numParcelas}x de ${formatarMoeda(valorBase)} lançadas.`);
      } else if (tipo === "Entrada" && status === "Parcialmente Pago") {
        const metade1 = Math.round((valorNumerico / 2) * 100) / 100;
        const metade2 = Math.round((valorNumerico - metade1) * 100) / 100;
        await adicionarTransacao({
          ...base,
          valor: metade1,
          status: "Pago",
          descricao: `${descricao.trim() || ""} (Pago 50%)`.trim(),
        });
        await adicionarTransacao({
          ...base,
          valor: metade2,
          status: "Pendente",
          descricao: `${descricao.trim() || ""} (Pendente 50%)`.trim(),
        });
        alertar(
          "Registrado como Parcialmente Pago",
          `${formatarMoeda(metade1)} Pago agora e ${formatarMoeda(metade2)} Pendente.`
        );
      } else {
        await adicionarTransacao({ ...base, status });
        alertar("Salvo", "Transação registrada com sucesso!");
      }

      if (tipo === "Entrada" && fotoUri && cliente.trim()) {
        try {
          await enviarFotoCliente(usuario.id, cliente.trim(), whatsapp.trim(), fotoUri);
        } catch (e) {
          alertar("Foto não salva", `A transação foi salva, mas a foto não: ${e.message}`);
        }
      }

      limparFormulario();
    } catch (e) {
      alertar("Erro ao salvar", e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <TelaAnimada style={styles.container}>
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={styles.titulo}>Nova Transação</Text>

      <Cartao>
        <Text style={styles.label}>Tipo de transação</Text>
        <View style={styles.linhaTipos}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setTipo(t);
                setStatus("Pago");
              }}
              style={[styles.chipTipo, tipo === t && styles.chipTipoAtivo]}
            >
              <Text style={[styles.chipTipoTexto, tipo === t && { color: CORES.branco }]}>
                {t === "Saida" ? "Saída" : t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <CampoData label="Data" valorIso={dataIso} onChange={setDataIso} />

        <Campo
          label="Valor (R$)"
          value={valor}
          onChangeText={setValor}
          placeholder="0,00"
          keyboardType="decimal-pad"
        />

        <Seletor label="Status" value={status} onValueChange={setStatus} opcoes={statusOpcoes} />
        {tipo === "Entrada" && status === "Parcialmente Pago" && valor ? (
          <Text style={styles.previewTexto}>
            Pago agora: {formatarMoeda(calcularValorNumerico() / 2)} • Pendente:{" "}
            {formatarMoeda(calcularValorNumerico() / 2)}
          </Text>
        ) : null}

        <Seletor
          label="Forma de pagamento"
          value={formaPagamento}
          onValueChange={setFormaPagamento}
          opcoes={FORMAS_PAGAMENTO}
        />

        {(tipo === "Despesa" || tipo === "Saida") && formaPagamento === "Cartão" && (
          <>
            <Seletor label="Parcelas" value={parcelas} onValueChange={setParcelas} opcoes={PARCELAS_OPCOES} />
            {valor && parcelas !== "1x" ? (
              <Text style={styles.previewTexto}>
                {parcelas} de {formatarMoeda(calcularValorNumerico() / parseInt(parcelas))} — 1ª agora, as
                demais nos meses seguintes
              </Text>
            ) : null}
          </>
        )}
      </Cartao>

      {tipo === "Entrada" && (
        <Cartao style={{ marginTop: 12 }}>
          <Seletor
            label="Veículo"
            value={veiculo}
            onValueChange={(v) => {
              setVeiculo(v);
              setServico(v === "Moto" ? SERVICOS_MOTO[0] : SERVICOS_CARRO[0]);
            }}
            opcoes={["Carro", "Moto"]}
          />
          <Seletor label="Tipo de serviço" value={servico} onValueChange={setServico} opcoes={servicosDisponiveis} />
          <Seletor label="Modelo do veículo" value={modelo || modelosDisponiveis[0]} onValueChange={setModelo} opcoes={modelosDisponiveis} />

          <View>
            <Campo label="Nome do cliente" value={cliente} onChangeText={aoMudarCliente} placeholder="Digite ou escolha..." />
            {mostrarSugestoes && (
              <View style={styles.caixaSugestoes}>
                {sugestoes.map((s) => (
                  <TouchableOpacity key={s.cliente} style={styles.itemSugestao} onPress={() => selecionarSugestao(s)}>
                    <Text style={{ color: CORES.branco }}>{s.cliente}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Campo label="WhatsApp (com DDD)" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="82988887777" />

          <Text style={styles.label}>Foto do cliente (opcional)</Text>
          <View style={styles.linhaFoto}>
            {fotoUri || fotoExistenteUrl ? (
              <Image source={{ uri: fotoUri || fotoExistenteUrl }} style={styles.previewFoto} />
            ) : (
              <View style={styles.previewFotoVazia}>
                <Text style={{ fontSize: 22 }}>👤</Text>
              </View>
            )}
            <Botao texto="📷 Escolher Foto" variante="secundario" onPress={escolherFoto} />
          </View>
        </Cartao>
      )}

      {(tipo === "Despesa" || tipo === "Saida") && (
        <Cartao style={{ marginTop: 12 }}>
          <Seletor label="Categoria" value={categoria} onValueChange={setCategoria} opcoes={CATEGORIAS_DESPESA} />
        </Cartao>
      )}

      <Cartao style={{ marginTop: 12 }}>
        <CampoData
          label="Prazo / vencimento (opcional)"
          valorIso={prazoIso}
          onChange={setPrazoIso}
          placeholderTexto="Sem prazo definido"
        />

        <Campo label="Descrição / observação" value={descricao} onChangeText={setDescricao} multiline />

        <Botao texto="Salvar Transação" onPress={salvar} carregando={salvando} />
      </Cartao>
    </ScrollView>
    </TelaAnimada>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.preto },
  titulo: { color: CORES.branco, fontSize: 20, fontWeight: "800", marginBottom: 14 },
  label: { color: CORES.cinza, fontSize: 12, marginBottom: 6, marginTop: 4 },
  linhaTipos: { flexDirection: "row", gap: 8, marginBottom: 14 },
  chipTipo: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: CORES.cinzaEscuro,
    alignItems: "center",
  },
  chipTipoAtivo: { backgroundColor: CORES.azul },
  chipTipoTexto: { color: CORES.cinza, fontWeight: "700", fontSize: 13 },
  campoData: {
    backgroundColor: CORES.cinzaEscuro,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  previewTexto: { color: CORES.azul, fontSize: 12, marginTop: -6, marginBottom: 14 },
  caixaSugestoes: {
    backgroundColor: CORES.cinzaEscuro,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 14,
    overflow: "hidden",
  },
  itemSugestao: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#2A2A32" },
  linhaFoto: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 6 },
  previewFoto: { width: 52, height: 52, borderRadius: 26 },
  previewFotoVazia: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: CORES.cinzaEscuro,
    alignItems: "center",
    justifyContent: "center",
  },
});
