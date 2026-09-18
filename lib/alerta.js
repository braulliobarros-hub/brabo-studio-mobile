import { Alert, Platform } from "react-native";

// O Alert.alert do react-native-web (pelo menos até a 0.21.x) é um NO-OP:
// não mostra nada e não chama nenhum botão. É por isso que na versão web
// do app o botão "Sair", o "Excluir" do histórico, o "Remover foto" dos
// clientes e todos os avisos de erro/sucesso ficavam mudos ao clicar.
//
// Esse helper tem a mesma cara do Alert.alert(titulo, mensagem, botoes),
// mas na web usa window.confirm/window.alert de verdade. No app nativo
// (iOS/Android) ele só repassa pro Alert.alert normal, que já funciona.
export function alertar(titulo, mensagem, botoes) {
  if (Platform.OS !== "web") {
    Alert.alert(titulo, mensagem, botoes);
    return;
  }

  const texto = mensagem ? `${titulo}\n\n${mensagem}` : titulo;

  // Sem botões, ou só um botão (avisos de erro/sucesso) -> alerta simples.
  if (!botoes || botoes.length <= 1) {
    window.alert(texto);
    botoes?.[0]?.onPress?.();
    return;
  }

  // Dois ou mais botões (confirmação: Cancelar / Excluir, Cancelar / Sair...)
  const confirmou = window.confirm(texto);
  const botaoCancelar = botoes.find((b) => b.style === "cancel");
  const botaoConfirmar =
    botoes.find((b) => b.style !== "cancel") || botoes[botoes.length - 1];

  if (confirmou) {
    botaoConfirmar?.onPress?.();
  } else {
    botaoCancelar?.onPress?.();
  }
}
