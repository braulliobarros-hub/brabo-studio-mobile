import { useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { CORES } from "./theme";

/**
 * Envolve o conteúdo de uma tela (aba) com uma transição suave de entrada
 * (fade + leve deslize de baixo pra cima) toda vez que a tela ganha foco —
 * ou seja, toda vez que o usuário troca de aba e volta pra ela.
 */
export function TelaAnimada({ children, style }) {
  const opacidade = useRef(new Animated.Value(0)).current;
  const deslocamento = useRef(new Animated.Value(10)).current;

  useFocusEffect(
    useCallback(() => {
      opacidade.setValue(0);
      deslocamento.setValue(10);
      Animated.parallel([
        Animated.timing(opacidade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(deslocamento, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <Animated.View
      style={[
        { flex: 1, opacity: opacidade, transform: [{ translateY: deslocamento }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

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

  const escala = useRef(new Animated.Value(1)).current;
  const inativo = disabled || carregando;

  function aoPressionar() {
    if (inativo) return;
    Animated.spring(escala, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }
  function aoSoltar() {
    if (inativo) return;
    Animated.spring(escala, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={aoPressionar}
      onPressOut={aoSoltar}
      disabled={inativo}
    >
      <Animated.View
        style={[
          styles.botao,
          { backgroundColor: fundo, opacity: disabled ? 0.5 : 1, transform: [{ scale: escala }] },
        ]}
      >
        {carregando ? (
          <ActivityIndicator color={CORES.branco} />
        ) : (
          <Text style={styles.botaoTexto}>{texto}</Text>
        )}
      </Animated.View>
    </Pressable>
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
          style={Platform.OS === "web" ? styles.seletorTextoWeb : { color: CORES.branco }}
          dropdownIconColor={CORES.branco}
          itemStyle={{ color: CORES.preto }}
        >
          {opcoes.map((op) => (
            <Picker.Item
              key={op}
              label={op}
              value={op}
              color={Platform.OS === "web" ? CORES.preto : undefined}
            />
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
  // No navegador, o <select> nativo ignora o tema escuro do app e abre a
  // lista de opções com fundo branco — por isso o texto precisa ser preto
  // aqui, senão fica branco sobre branco (some até passar o mouse).
  seletorTextoWeb: {
    color: CORES.preto,
    backgroundColor: CORES.branco,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeTexto: { fontSize: 11, fontWeight: "700" },
});
