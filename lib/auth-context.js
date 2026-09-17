import { createContext, useContext, useEffect, useState } from "react";
import { supabase, definirManterConectado } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, novaSessao) => {
        setSession(novaSessao);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const entrar = async (email, senha, manterConectado = true) => {
    definirManterConectado(manterConectado);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    return error;
  };

  const sair = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        usuario: session?.user || null,
        carregando,
        entrar,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa ser usado dentro de um AuthProvider");
  }
  return contexto;
}
