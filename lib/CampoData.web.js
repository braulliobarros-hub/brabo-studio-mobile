import { View, Text, StyleSheet } from "react-native";
import { CORES } from "./theme";

/** Campo de data para web — usa o <input type="date"> nativo do navegador. */
export function CampoData({ label, valorIso, onChange, placeholderTexto }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <input
        type="date"
        value={valorIso || ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          backgroundColor: CORES.cinzaEscuro,
          color: CORES.branco,
          border: "none",
          borderRadius: 8,
          padding: "12px 14px",
          fontSize: 15,
          width: "100%",
          colorScheme: "dark",
          fontFamily: "inherit",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: CORES.cinza, fontSize: 12, marginBottom: 6 },
});
