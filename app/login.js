import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../lib/auth-context";
import { CORES } from "../lib/theme";

export default function TelaLogin() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleEntrar = async () => {
    if (!email.trim() || !senha) {
      setErro("Preenche e-mail e senha.");
      return;
    }
    setErro("");
    setCarregando(true);
    const erroLogin = await entrar(email.trim(), senha);
    setCarregando(false);
    if (erroLogin) {
      setErro("E-mail ou senha incorretos.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.centro}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitulo}>Gestão Financeira</Text>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="seuemail@exemplo.com"
            placeholderTextColor={CORES.cinza}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={CORES.cinza}
          />

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <TouchableOpacity
            style={styles.botao}
            onPress={handleEntrar}
            disabled={carregando}
          >
            {carregando ? (
              <ActivityIndicator color={CORES.branco} />
            ) : (
              <Text style={styles.botaoTexto}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CORES.preto },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: { width: 220, height: 90, marginBottom: 4 },
  subtitulo: { color: CORES.cinza, fontSize: 14, marginBottom: 36 },
  form: { width: "100%", maxWidth: 340 },
  label: { color: CORES.cinza, fontSize: 12, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: CORES.cinzaEscuro,
    color: CORES.branco,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  erro: { color: CORES.vermelho, marginTop: 14, fontSize: 13 },
  botao: {
    backgroundColor: CORES.azul,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 26,
  },
  botaoTexto: { color: CORES.branco, fontSize: 16, fontWeight: "700" },
});
