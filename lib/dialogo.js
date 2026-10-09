import { Alert, Platform } from "react-native";

/** Aviso simples. No navegador o Alert do React Native não faz nada, então usa window.alert. */
export function avisar(titulo, mensagem) {
  if (Platform.OS === "web") {
    window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

/** Pergunta de confirmação (Cancelar / ação). */
export function confirmar(titulo, mensagem, textoAcao, aoConfirmar, destrutivo = false) {
  if (Platform.OS === "web") {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) aoConfirmar();
    return;
  }
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: textoAcao, style: destrutivo ? "destructive" : "default", onPress: aoConfirmar },
  ]);
}
