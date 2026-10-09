// Itens do checklist de entrada do veículo (Carro e Moto).
// Cada grupo vira um cartão na tela e uma seção no PDF.
// Pra mudar um item, é só editar o texto aqui — não precisa mexer em mais nada.

export const COMBUSTIVEL_OPCOES = ["Reserva", "1/4", "1/2", "3/4", "Cheio"];
export const SUJEIRA_OPCOES = ["Leve", "Média", "Pesada"];

export const ESTADOS = {
  ok: "OK",
  avaria: "Avaria",
  na: "N/A",
};

export const GRUPOS_CARRO = [
  {
    titulo: "Exterior",
    itens: [
      "Capô",
      "Teto",
      "Porta-malas (tampa)",
      "Para-choque dianteiro",
      "Para-choque traseiro",
      "Lateral esquerda",
      "Lateral direita",
      "Para-brisa e vidros",
      "Faróis e lanternas",
      "Retrovisores",
      "Rodas e pneus",
    ],
  },
  {
    titulo: "Interior",
    itens: [
      "Painel e console",
      "Volante e câmbio",
      "Bancos dianteiros",
      "Bancos traseiros",
      "Tapetes e carpete",
      "Forro e portas (internas)",
      "Porta-malas (interior)",
      "Vidros elétricos e ar-condicionado",
    ],
  },
];

export const GRUPOS_MOTO = [
  {
    titulo: "Carenagens e pintura",
    itens: [
      "Tanque",
      "Carenagem frontal",
      "Lateral esquerda",
      "Lateral direita",
      "Rabeta / traseira",
      "Paralamas",
    ],
  },
  {
    titulo: "Conjunto",
    itens: [
      "Farol, lanterna e setas",
      "Retrovisores",
      "Guidão e manetes",
      "Painel / velocímetro",
      "Banco",
      "Rodas e pneus",
      "Escapamento",
      "Corrente e transmissão (visual)",
      "Baú / bagageiro",
    ],
  },
];

export function gruposDoVeiculo(veiculo) {
  return veiculo === "Moto" ? GRUPOS_MOTO : GRUPOS_CARRO;
}

/** Estado inicial: tudo "OK" — no dia a dia só toca nas exceções. */
export function itensIniciais(veiculo) {
  const itens = {};
  for (const grupo of gruposDoVeiculo(veiculo)) {
    for (const nome of grupo.itens) {
      itens[nome] = { estado: "ok", obs: "" };
    }
  }
  return itens;
}

export const TEXTO_RODAPE_PDF =
  "Registro do estado do veículo na entrada, feito junto com o cliente antes do início do serviço.";
