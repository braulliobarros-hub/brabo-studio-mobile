import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { CORES } from "./theme";

export function Cartao({ children, style }) {
  return <View style={[styles.cartao, style]}>{children}</View>;
}

export function CartaoValor({ titulo, valor, cor }) {
  return (
    <Cartao style={{ flex: 1 }}>
      <Text style={styles.rotuloCartao}>{titulo}</Text>
      <Text style={[styles.valorCartao, { color: cor || CORES.branco }]}>
        {valor}
      </Text>
    </Cartao>
  );
}

export function Botao({ texto, onPress, cor, variante = "primario", carregando, disabled }) {
  const fundo =
    variante === "primario" ? cor || CORES.azul :
    variante === "perigo" ? CORES.vermelho :
    CORES.cinzaEscuro;
  return (
    <TouchableOpacity
      style={[styles.botao, { backgroundColor: fundo, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled || carregando}
    >
      {carregando ? (
        <ActivityIndicator color={CORES.branco} />
      ) : (
        <Text style={styles.botaoTexto}>{texto}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Campo({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={CORES.cinza}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
      />
    </View>
  );
}

export function Seletor({ label, value, onValueChange, opcoes }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.seletorBox}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          style={{ color: CORES.branco }}
          dropdownIconColor={CORES.branco}
        >
          {opcoes.map((op) => (
            <Picker.Item key={op} label={op} value={op} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

export function Badge({ texto, cor }) {
  return (
    <View style={[styles.badge, { backgroundColor: cor + "26" }]}>
      <Text style={[styles.badgeTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: CORES.pretoCard,
    borderRadius: 12,
    padding: 16,
  },
  rotuloCartao: { color: CORES.cinza, fontSize: 11 },
  valorCartao: { fontSize: 18, fontWeight: "800", marginTop: 6 },
  botao: {
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoTexto: { color: CORES.branco, fontSize: 15, fontWeight: "700" },
  label: { color: CORES.cinza, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: CORES.cinzaEscuro,
    color: CORES.branco,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  seletorBox: {
    backgroundColor: CORES.cinzaEscuro,
    borderRadius: 8,
    overflow: "hidden",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeTexto: { fontSize: 11, fontWeight: "700" },
});
