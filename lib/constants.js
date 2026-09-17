export const FORMAS_PAGAMENTO = ["Dinheiro", "Pix", "Cartão"];

export const CATEGORIAS_DESPESA = [
  "Produtos de limpeza / Estoque",
  "Combustível",
  "Funcionário",
  "Investimento (equipamento)",
  "Despesa Fixa",
  "Retirada do Proprietário",
  "Outros",
];

export const SERVICOS_CARRO = [
  "Lavagem Simples",
  "Lavagem Detalhada",
  "Lavagem + Aspiração",
  "Aspiração",
];
export const SERVICOS_MOTO = [
  "Lavagem Simples",
  "Lavagem Detalhada",
  "Lavagem + Proteção",
];

export const MODELOS_CARRO = [
  "Argo", "Civic", "City", "Compass", "Corolla", "Corolla Cross", "Cronos", "Creta",
  "Cruze", "Duster", "EcoSport", "Etios", "Fastback", "Fiesta", "Fit", "Focus", "Fox",
  "Gol", "HB20", "HB20S", "Hilux", "HR-V", "Jetta", "Ka", "Kicks", "Kwid", "L200 Triton",
  "Logan", "March", "Mobi", "Nivus", "Onix", "Onix Plus", "Palio", "Polo", "Prisma",
  "Pulse", "Ranger", "RAV4", "Renegade", "S10", "Sandero", "Saveiro", "Sentra", "Siena",
  "Spin", "Strada", "T-Cross", "Territory", "Tiggo 7", "Toro", "Tracker", "Tucson",
  "Uno", "Versa", "Virtus", "Voyage", "WR-V", "Yaris",
].sort();

export const MODELOS_MOTO = [
  "Biz 110i", "Biz 125", "Bros 160", "Burgman 125", "CB 300F Twister", "CB 500F",
  "CB 650R", "CG 160", "CG 160 Fan", "CG 160 Titan", "Citycom 300", "Classic 350",
  "Elite 125", "Factor 125", "Factor 150", "Fazer 250", "Fluo 125", "GSX-S750",
  "Lead 110", "Meteor 350", "MT-03", "MT-07", "NH 190", "Ninja 300", "Ninja 400",
  "NMAX", "NXR 160 Bros", "PCX", "Pop 110i", "SHI 175", "Tenere 250", "Versys 650",
  "XRE 190", "XRE 300", "XTZ 150 Crosser", "XTZ 250 Lander", "YBR 125", "Z400",
].sort();

export const CATEGORIA_NATUREZA = {
  "Despesa Fixa": "Fixa",
  "Combustível": "Variável",
  "Funcionário": "Variável",
  "Produtos de limpeza / Estoque": "Variável",
  "Investimento (equipamento)": "Investimento",
  "Retirada do Proprietário": "Retirada",
  "Outros": "Variável",
};

export const MENSAGENS_LEMBRETE = {
  Carro:
    "E aí, {cliente}! Já faz {dias} dias desde a última vez que seu carro sentiu " +
    "aquele cuidado raro da Brabo Studio 🖤🔵 Bora marcar um horário pra uma lavagem " +
    "de rotina e deixar ele barbada de novo, parecendo que acabou de sair da loja? " +
    "Chama aqui e a gente já encaixa você.",
  Moto:
    "E aí, {cliente}! Já faz {dias} dias desde a última vez que sua moto sentiu " +
    "aquele cuidado raro da Brabo Studio 🖤🔵 Bora marcar um horário pra uma lavagem " +
    "de rotina e deixar ela brabíssima de novo, brilhando que nem saiu da loja? " +
    "Chama aqui e a gente já encaixa você.",
};

export function montarMensagemLembrete(veiculo, cliente, dias) {
  const template =
    MENSAGENS_LEMBRETE[veiculo] ||
    "E aí, {cliente}! Já faz {dias} dias desde a última vez que seu veículo sentiu " +
      "aquele cuidado raro da Brabo Studio 🖤🔵 Bora marcar um horário e deixar ele " +
      "brabo de novo? Chama aqui e a gente já encaixa você.";
  return template.replace("{cliente}", cliente).replace("{dias}", dias);
}

export function gerarLinkWhatsapp(numero, mensagem) {
  const apenasDigitos = (numero || "").replace(/\D/g, "");
  if (!apenasDigitos) return null;
  const comCodigoPais =
    apenasDigitos.length <= 11 ? `55${apenasDigitos}` : apenasDigitos;
  return `https://wa.me/${comCodigoPais}?text=${encodeURIComponent(mensagem)}`;
}
