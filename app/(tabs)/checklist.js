import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CORES } from "../../lib/theme";
import { Botao, Campo, Cartao, TelaAnimada } from "../../lib/ui";
import { useAuth } from "../../lib/auth-context";
import { listarClientesDetalhado } from "../../lib/queries";
import { avisar, confirmar } from "../../lib/dialogo";
import {
  COMBUSTIVEL_OPCOES,
  SUJEIRA_OPCOES,
  gruposDoVeiculo,
  itensIniciais,
} from "../../lib/checklist-itens";
import {
  montarPdf,
  salvarChecklist,
  atualizarChecklist,
  excluirChecklist,
  urlsDasFotos,
  listarChecklistsRecentes,
  dadosParaPdf,
  enviarPdf,
  abrirPdf,
  baixarPdf,
  prepararFoto,
} from "../../lib/checklist";

const MAX_FOTOS = 6;

function Chips({ opcoes, valor, onChange }) {
  return (
    <View style={styles.chips}>
      {opcoes.map((op) => (
        <TouchableOpacity
          key={op}
          style={[styles.chip, valor === op && styles.chipAtivo]}
          onPress={() => onChange(valor === op ? "" : op)}
        >
          <Text style={[styles.chipTexto, valor === op && { color: CORES.branco }]}>{op}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ESTADO_COR = { ok: CORES.verde, avaria: CORES.vermelho, na: CORES.cinza };
const ESTADO_TXT = { ok: "OK", avaria: "Avaria", na: "N/A" };

function LinhaItem({ nome, item, onEstado, onObs }) {
  return (
    <View style={styles.linhaItem}>
      <View style={styles.linhaTopo}>
        <Text style={styles.itemNome}>{nome}</Text>
        <View style={styles.estados}>
          {["ok", "avaria", "na"].map((e) => (
            <TouchableOpacity
              key={e}
              onPress={() => onEstado(e)}
              style={[
                styles.estado,
                item.estado === e && { backgroundColor: ESTADO_COR[e] + "33", borderColor: ESTADO_COR[e] },
              ]}
            >
              <Text style={[styles.estadoTexto, item.estado === e && { color: ESTADO_COR[e] }]}>
                {ESTADO_TXT[e]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {item.estado === "avaria" ? (
        <TextInput
          style={styles.obs}
          value={item.obs}
          onChangeText={onObs}
          placeholder="Descreve a avaria (ex: risco de 10cm)"
          placeholderTextColor={CORES.cinza}
        />
      ) : null}
    </View>
  );
}

export default function Checklist() {
  const { usuario } = useAuth();
  const [veiculo, setVeiculo] = useState("Carro");
  const [cliente, setCliente] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [cor, setCor] = useState("");
  const [km, setKm] = useState("");
  const [combustivel, setCombustivel] = useState("");
  const [servico, setServico] = useState("");
  const [sujeira, setSujeira] = useState("");
  const [itens, setItens] = useState(() => itensIniciais("Carro"));
  const [pertences, setPertences] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [fotos, setFotos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState(null); // {pdf, dados}
  const [recentes, setRecentes] = useState([]);
  const [acao, setAcao] = useState(null); // { id, tipo } do botão que está carregando
  const [editando, setEditando] = useState(null); // linha do banco em edição
  const [fotosSalvas, setFotosSalvas] = useState([]); // [{ caminho, url }] fotos já no Storage
  const [fotosRemovidas, setFotosRemovidas] = useState([]); // caminhos tirados na edição
  const scrollRef = useRef(null);
  const totalFotos = fotosSalvas.length + fotos.length;

  const carregarRecentes = useCallback(async () => {
    try {
      setRecentes(await listarChecklistsRecentes());
    } catch (e) {
      console.warn("Checklists recentes:", e.message);
    }
  }, []);

  useEffect(() => {
    carregarRecentes();
    listarClientesDetalhado().then(setClientes).catch(() => {});
  }, [carregarRecentes]);

  const sugestoes = useMemo(() => {
    const t = cliente.trim().toLowerCase();
    if (t.length < 2) return [];
    return clientes
      .filter((c) => (c.cliente || "").toLowerCase().includes(t) && c.cliente.toLowerCase() !== t)
      .slice(0, 4);
  }, [cliente, clientes]);

  function escolherCliente(c) {
    setCliente(c.cliente || "");
    if (c.whatsapp) setWhatsapp(c.whatsapp);
    if (c.modelo && !modelo) setModelo(c.modelo);
    if (c.veiculo === "Moto" || c.veiculo === "Carro") trocarVeiculo(c.veiculo);
  }

  function trocarVeiculo(v) {
    if (v === veiculo) return;
    setVeiculo(v);
    setItens(itensIniciais(v));
  }

  function setEstado(nome, estado) {
    setItens((atual) => ({ ...atual, [nome]: { ...atual[nome], estado } }));
  }
  function setObs(nome, obs) {
    setItens((atual) => ({ ...atual, [nome]: { ...atual[nome], obs } }));
  }

  async function adicionarFoto(camera) {
    if (totalFotos >= MAX_FOTOS) {
      avisar("Limite de fotos", `Máximo de ${MAX_FOTOS} fotos por checklist.`);
      return;
    }
    try {
      let r;
      if (camera && Platform.OS !== "web") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return avisar("Permissão necessária", "Preciso de acesso à câmera.");
        r = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      } else {
        if (Platform.OS !== "web") {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return avisar("Permissão necessária", "Preciso de acesso às fotos.");
        }
        r = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
          allowsMultipleSelection: true,
          selectionLimit: MAX_FOTOS - totalFotos,
        });
      }
      if (r.canceled) return;
      const novas = [];
      for (const a of r.assets) {
        try {
          novas.push(await prepararFoto(a.uri));
        } catch (e) {
          console.warn("Foto ignorada:", e.message);
        }
      }
      setFotos((atual) => [...atual, ...novas].slice(0, MAX_FOTOS - fotosSalvas.length));
    } catch (e) {
      avisar("Erro ao pegar foto", e.message);
    }
  }

  function limpar() {
    setCliente(""); setWhatsapp(""); setModelo(""); setPlaca(""); setCor("");
    setKm(""); setCombustivel(""); setServico(""); setSujeira("");
    setItens(itensIniciais(veiculo));
    setPertences(""); setObservacoes(""); setFotos([]);
    setFotosSalvas([]); setFotosRemovidas([]); setEditando(null);
    setResultado(null);
  }

  function irProTopo() {
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }

  async function editar(linha) {
    setAcao({ id: linha.id, tipo: "editar" });
    try {
      const tipo = linha.tipo_veiculo === "Moto" ? "Moto" : "Carro";
      setResultado(null);
      setEditando(linha);
      setVeiculo(tipo);
      setCliente(linha.cliente || "");
      setWhatsapp(linha.whatsapp || "");
      setModelo(linha.modelo || "");
      setPlaca(linha.placa || "");
      setCor(linha.cor || "");
      setKm(linha.km || "");
      setCombustivel(linha.combustivel || "");
      setServico(linha.servico || "");
      setSujeira(linha.sujeira || "");
      // Junta com a lista padrão, caso algum item tenha sido adicionado depois.
      setItens({ ...itensIniciais(tipo), ...(linha.itens || {}) });
      setPertences(linha.pertences || "");
      setObservacoes(linha.observacoes || "");
      setFotos([]);
      setFotosRemovidas([]);
      setFotosSalvas(await urlsDasFotos(linha.fotos || []));
      irProTopo();
    } catch (e) {
      avisar("Erro ao abrir pra edição", e.message);
    } finally {
      setAcao(null);
    }
  }

  function cancelarEdicao() {
    limpar();
    irProTopo();
  }

  function removerFotoSalva(f) {
    setFotosSalvas((atual) => atual.filter((x) => x.caminho !== f.caminho));
    setFotosRemovidas((atual) => [...atual, f.caminho]);
  }

  function excluir(linha) {
    confirmar(
      "Excluir checklist",
      `Excluir o checklist de ${linha.cliente || "cliente"} (${linha.modelo || linha.placa || linha.tipo_veiculo})? Isso não tem volta.`,
      "Excluir",
      async () => {
        setAcao({ id: linha.id, tipo: "excluir" });
        try {
          await excluirChecklist(linha);
          if (editando && editando.id === linha.id) limpar();
          setRecentes((atual) => atual.filter((r) => r.id !== linha.id));
        } catch (e) {
          avisar("Não consegui excluir", e.message);
        } finally {
          setAcao(null);
        }
      },
      true
    );
  }

  async function gerarDaLinha(linha) {
    const { dados, fotos: fb } = await dadosParaPdf(linha);
    const pdf = await montarPdf(dados, fb);
    return { pdf, dados };
  }

  async function abrirDaLista(linha) {
    // Na web, abre a aba já no clique pra o navegador não bloquear o pop-up.
    const janela = Platform.OS === "web" ? window.open("", "_blank") : null;
    if (janela) janela.document.write("<p style='font-family:sans-serif;padding:20px'>Gerando o PDF...</p>");
    setAcao({ id: linha.id, tipo: "abrir" });
    try {
      const { pdf, dados } = await gerarDaLinha(linha);
      await abrirPdf(pdf, dados, janela);
    } catch (e) {
      if (janela) janela.close();
      avisar("Erro ao abrir o PDF", e.message);
    } finally {
      setAcao(null);
    }
  }

  async function enviarDaLista(linha) {
    setAcao({ id: linha.id, tipo: "enviar" });
    try {
      const { pdf, dados } = await gerarDaLinha(linha);
      if (Platform.OS === "web") {
        // No navegador o compartilhar precisa de um toque "fresco",
        // então mostra a tela com o botão de enviar.
        setResultado({ pdf, dados, salvo: true });
        irProTopo();
      } else {
        await enviarPdf(pdf, dados);
      }
    } catch (e) {
      avisar("Erro ao gerar o PDF", e.message);
    } finally {
      setAcao(null);
    }
  }

  async function finalizar() {
    if (!cliente.trim()) return avisar("Falta o cliente", "Preenche o nome do cliente.");
    if (!modelo.trim() && !placa.trim())
      return avisar("Falta o veículo", "Preenche pelo menos o modelo ou a placa.");
    setSalvando(true);
    const dados = {
      tipo_veiculo: veiculo,
      cliente: cliente.trim(),
      whatsapp: whatsapp.trim(),
      modelo: modelo.trim(),
      placa: placa.trim().toUpperCase(),
      cor: cor.trim(),
      km: km.trim(),
      combustivel,
      servico: servico.trim(),
      sujeira,
      itens,
      pertences: pertences.trim(),
      observacoes: observacoes.trim(),
    };
    try {
      // PDF primeiro: se o banco falhar, o PDF ainda sai.
      const criadoEm = editando ? new Date(editando.criado_em) : new Date();
      const pdf = await montarPdf({ ...dados, criadoEm }, [...fotosSalvas.map((f) => f.url), ...fotos]);
      let salvo = true;
      try {
        if (editando) {
          await atualizarChecklist(
            editando.id,
            usuario.id,
            dados,
            fotosSalvas.map((f) => f.caminho),
            fotosRemovidas,
            fotos
          );
        } else {
          await salvarChecklist(usuario.id, dados, fotos);
        }
      } catch (e) {
        salvo = false;
        console.warn("Erro ao salvar checklist:", e.message);
      }
      setResultado({ pdf, dados: { ...dados, criadoEm }, salvo });
      if (salvo) {
        setEditando(null);
        setFotosSalvas([]);
        setFotosRemovidas([]);
        carregarRecentes();
      }
    } catch (e) {
      avisar("Erro ao gerar o checklist", e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function enviar() {
    try {
      await enviarPdf(resultado.pdf, resultado.dados);
    } catch (e) {
      avisar("Não consegui compartilhar", e.message);
    }
  }

  if (resultado) {
    const avarias = Object.values(resultado.dados.itens || {}).filter((i) => i.estado === "avaria").length;
    return (
      <TelaAnimada>
        <ScrollView style={styles.fundo} contentContainerStyle={styles.tela}>
          <Cartao>
            <Text style={styles.okTitulo}>Checklist pronto</Text>
            <Text style={styles.okTexto}>
              {resultado.dados.cliente} · {resultado.dados.modelo || resultado.dados.placa}
            </Text>
            <Text style={styles.okTexto}>
              {avarias === 0 ? "Nenhuma avaria registrada." : `${avarias} avaria(s) registrada(s).`}
            </Text>
            {!resultado.salvo ? (
              <Text style={[styles.okTexto, { color: CORES.laranja, marginTop: 6 }]}>
                Atenção: o PDF foi gerado, mas não consegui salvar no banco. Confere se a tabela
                checklists foi criada no Supabase.
              </Text>
            ) : null}
          </Cartao>
          <View style={{ height: 12 }} />
          <Botao texto="Enviar PDF no WhatsApp" cor={CORES.verde} onPress={enviar} />
          <View style={{ height: 10 }} />
          <Botao texto="Abrir PDF" variante="secundario" onPress={() => abrirPdf(resultado.pdf, resultado.dados).catch((e) => avisar("Erro ao abrir o PDF", e.message))} />
          <View style={{ height: 10 }} />
          <Botao texto="Baixar PDF" variante="secundario" onPress={() => baixarPdf(resultado.pdf, resultado.dados)} />
          <View style={{ height: 10 }} />
          <Botao texto="Novo checklist" variante="secundario" onPress={limpar} />
        </ScrollView>
      </TelaAnimada>
    );
  }

  return (
    <TelaAnimada>
      <KeyboardAvoidingView style={styles.fundo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} style={styles.fundo} contentContainerStyle={styles.tela} keyboardShouldPersistTaps="handled">
          <Text style={styles.titulo}>{editando ? "Editando checklist" : "Checklist de entrada"}</Text>
          {editando ? (
            <View style={styles.avisoEdicao}>
              <Text style={styles.avisoEdicaoTexto}>
                Editando o checklist de {editando.cliente || "cliente"} de{" "}
                {new Date(editando.criado_em).toLocaleDateString("pt-BR")}.
              </Text>
              <TouchableOpacity onPress={cancelarEdicao} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.avisoEdicaoLink}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.toggle}>
            {["Carro", "Moto"].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.toggleBtn, veiculo === v && styles.toggleAtivo]}
                onPress={() => trocarVeiculo(v)}
              >
                <Text style={[styles.toggleTexto, veiculo === v && { color: CORES.branco }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Campo label="Cliente" value={cliente} onChangeText={setCliente} placeholder="Nome do cliente" />
          {sugestoes.length > 0 ? (
            <View style={styles.sugestoes}>
              {sugestoes.map((c) => (
                <TouchableOpacity key={c.cliente} style={styles.sugestao} onPress={() => escolherCliente(c)}>
                  <Text style={styles.sugestaoTexto}>
                    {c.cliente}
                    {c.modelo ? ` · ${c.modelo}` : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <Campo label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="DDD + número" keyboardType="phone-pad" />
          <Campo label="Modelo" value={modelo} onChangeText={setModelo} placeholder={veiculo === "Moto" ? "Ex: CG 160" : "Ex: Onix"} />
          <View style={styles.dupla}>
            <View style={{ flex: 1 }}><Campo label="Placa" value={placa} onChangeText={setPlaca} placeholder="ABC1D23" /></View>
            <View style={{ flex: 1 }}><Campo label="Cor" value={cor} onChangeText={setCor} placeholder="Prata" /></View>
          </View>
          <Campo label="Quilometragem" value={km} onChangeText={setKm} placeholder="Ex: 48320" keyboardType="numeric" />
          <Text style={styles.label}>Combustível</Text>
          <Chips opcoes={COMBUSTIVEL_OPCOES} valor={combustivel} onChange={setCombustivel} />
          <Text style={styles.label}>Nível de sujeira</Text>
          <Chips opcoes={SUJEIRA_OPCOES} valor={sujeira} onChange={setSujeira} />
          <Campo label="Serviço" value={servico} onChangeText={setServico} placeholder="Ex: Lavagem detalhada" />

          {gruposDoVeiculo(veiculo).map((g) => (
            <Cartao key={g.titulo} style={{ marginBottom: 12 }}>
              <Text style={styles.grupo}>{g.titulo}</Text>
              {g.itens.map((nome) => (
                <LinhaItem
                  key={nome}
                  nome={nome}
                  item={itens[nome] || { estado: "ok", obs: "" }}
                  onEstado={(e) => setEstado(nome, e)}
                  onObs={(t) => setObs(nome, t)}
                />
              ))}
            </Cartao>
          ))}

          <Campo label="Pertences deixados no veículo" value={pertences} onChangeText={setPertences} multiline placeholder="Ex: guarda-chuva, carregador..." />

          <Text style={styles.label}>Fotos ({totalFotos}/{MAX_FOTOS})</Text>
          <View style={styles.fotos}>
            {fotosSalvas.map((f) => (
              <TouchableOpacity key={f.caminho} onPress={() => removerFotoSalva(f)}>
                <Image source={{ uri: f.url }} style={styles.foto} />
                <Text style={styles.fotoX}>remover</Text>
              </TouchableOpacity>
            ))}
            {fotos.map((uri, i) => (
              <TouchableOpacity key={uri + i} onPress={() => setFotos(fotos.filter((_, j) => j !== i))}>
                <Image source={{ uri }} style={styles.foto} />
                <Text style={styles.fotoX}>remover</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dupla}>
            {Platform.OS !== "web" ? (
              <View style={{ flex: 1 }}><Botao texto="Tirar foto" variante="secundario" onPress={() => adicionarFoto(true)} /></View>
            ) : null}
            <View style={{ flex: 1 }}><Botao texto={Platform.OS === "web" ? "Adicionar fotos" : "Galeria"} variante="secundario" onPress={() => adicionarFoto(false)} /></View>
          </View>

          <View style={{ height: 14 }} />
          <Campo label="Observações gerais" value={observacoes} onChangeText={setObservacoes} multiline placeholder="Algo que o cliente pediu ou avisou" />

          <Botao
            texto={editando ? "Salvar alterações e gerar PDF" : "Salvar checklist e gerar PDF"}
            onPress={finalizar}
            carregando={salvando}
          />
          {editando ? (
            <>
              <View style={{ height: 10 }} />
              <Botao texto="Cancelar edição" variante="secundario" onPress={cancelarEdicao} />
            </>
          ) : null}

          {recentes.length > 0 ? (
            <View style={{ marginTop: 26 }}>
              <Text style={styles.grupo}>Checklists recentes</Text>
              {recentes.map((r) => (
                <Cartao key={r.id} style={{ marginTop: 8 }}>
                  <Text style={styles.itemNome}>
                    {r.cliente} · {r.modelo || r.placa}
                  </Text>
                  <Text style={styles.okTexto}>
                    {r.tipo_veiculo} · {new Date(r.criado_em).toLocaleString("pt-BR")}
                  </Text>
                  <View style={[styles.dupla, { marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Botao texto="Abrir" variante="secundario" carregando={acao?.id === r.id && acao.tipo === "abrir"} disabled={!!acao} onPress={() => abrirDaLista(r)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Botao texto="Enviar" cor={CORES.verde} carregando={acao?.id === r.id && acao.tipo === "enviar"} disabled={!!acao} onPress={() => enviarDaLista(r)} />
                    </View>
                  </View>
                  <View style={[styles.dupla, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Botao texto="Editar" variante="secundario" carregando={acao?.id === r.id && acao.tipo === "editar"} disabled={!!acao} onPress={() => editar(r)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Botao texto="Excluir" cor={CORES.vermelho} carregando={acao?.id === r.id && acao.tipo === "excluir"} disabled={!!acao} onPress={() => excluir(r)} />
                    </View>
                  </View>
                </Cartao>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </TelaAnimada>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: CORES.preto },
  tela: { padding: 20, paddingBottom: 60 },
  titulo: { color: CORES.branco, fontSize: 22, fontWeight: "800", marginBottom: 14 },
  label: { color: CORES.cinza, fontSize: 12, marginBottom: 6 },
  toggle: { flexDirection: "row", backgroundColor: CORES.cinzaEscuro, borderRadius: 10, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  toggleAtivo: { backgroundColor: CORES.azul },
  toggleTexto: { color: CORES.cinza, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { backgroundColor: CORES.cinzaEscuro, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  chipAtivo: { backgroundColor: CORES.azul },
  chipTexto: { color: CORES.cinza, fontWeight: "600", fontSize: 13 },
  dupla: { flexDirection: "row", gap: 10 },
  sugestoes: { backgroundColor: CORES.pretoCard, borderRadius: 8, marginTop: -8, marginBottom: 14 },
  sugestao: { padding: 12, borderBottomWidth: 1, borderBottomColor: CORES.cinzaEscuro },
  sugestaoTexto: { color: CORES.branco },
  grupo: { color: CORES.branco, fontSize: 16, fontWeight: "800", marginBottom: 6 },
  linhaItem: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: CORES.cinzaEscuro },
  linhaTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  itemNome: { color: CORES.branco, fontSize: 14, fontWeight: "600", flexShrink: 1 },
  estados: { flexDirection: "row", gap: 6 },
  estado: { borderWidth: 1, borderColor: CORES.cinzaEscuro, backgroundColor: CORES.cinzaEscuro, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  estadoTexto: { color: CORES.cinza, fontSize: 12, fontWeight: "700" },
  obs: { backgroundColor: CORES.cinzaEscuro, color: CORES.branco, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginTop: 8, fontSize: 14 },
  fotos: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  foto: { width: 90, height: 90, borderRadius: 8 },
  fotoX: { color: CORES.cinza, fontSize: 10, textAlign: "center", marginTop: 2 },
  okTitulo: { color: CORES.verde, fontSize: 20, fontWeight: "800", marginBottom: 6 },
  okTexto: { color: CORES.cinza, fontSize: 13, marginTop: 2 },
  avisoEdicao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, backgroundColor: CORES.azul + "22", borderColor: CORES.azul, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  avisoEdicaoTexto: { color: CORES.branco, fontSize: 13, flexShrink: 1 },
  avisoEdicaoLink: { color: CORES.azul, fontWeight: "800", fontSize: 13 },
});
