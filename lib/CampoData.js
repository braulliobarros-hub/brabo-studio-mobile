import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CORES } from "./theme";
import { dataIsoParaBr } from "./format";

/** Campo de data para Android/iOS — abre o seletor nativo do sistema. */
export function CampoData({ label, valorIso, onChange, placeholderTexto }) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.campo} onPress={() => setMostrar(true)}>
        <Text style={{ color: valorIso ? CORES.branco : CORES.cinza }}>
          {valorIso ? dataIsoParaBr(valorIso) : placeholderTexto || "Escolher data"}
        </Text>
      </TouchableOpacity>
      {mostrar && (
        <DateTimePicker
          value={new Date((valorIso || new Date().toISOString().substring(0, 10)) + "T12:00:00")}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(evento, novaData) => {
            setMostrar(Platform.OS === "ios");
            if (novaData) onChange(novaData.toISOString().substring(0, 10));
            if (Platform.OS === "android") setMostrar(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: CORES.cinza, fontSize: 12, marginBottom: 6 },
  campo: {
    backgroundColor: CORES.cinzaEscuro,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
