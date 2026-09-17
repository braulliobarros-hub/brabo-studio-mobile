import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase não configurado! Copia o .env.example pra .env e preenche as chaves."
  );
}

const CHAVE_MANTER_CONECTADO = "brabo_manter_conectado";

// No navegador, decide se a sessao fica salva no localStorage (sobrevive a
// fechar a aba ou o navegador) ou no sessionStorage (some ao fechar a aba),
// de acordo com a opcao "Manter conectado" escolhida na tela de login.
const storageWeb = {
  getItem: (chave) => {
    const valor =
      window.localStorage.getItem(chave) ?? window.sessionStorage.getItem(chave);
    return Promise.resolve(valor);
  },
  setItem: (chave, valor) => {
    const manter = window.localStorage.getItem(CHAVE_MANTER_CONECTADO) !== "false";
    if (manter) {
      window.localStorage.setItem(chave, valor);
      window.sessionStorage.removeItem(chave);
    } else {
      window.sessionStorage.setItem(chave, valor);
      window.localStorage.removeItem(chave);
    }
    return Promise.resolve();
  },
  removeItem: (chave) => {
    window.localStorage.removeItem(chave);
    window.sessionStorage.removeItem(chave);
    return Promise.resolve();
  },
};

export function definirManterConectado(manter) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(CHAVE_MANTER_CONECTADO, manter ? "true" : "false");
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? storageWeb : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
