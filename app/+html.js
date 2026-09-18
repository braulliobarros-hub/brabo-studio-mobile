import { ScrollViewStyleReset } from "expo-router/html";

// Este arquivo controla o HTML raiz da versão web (fora do controle do React).
// É aqui que ficam favicon, manifest (PWA) e o ícone que aparece quando alguém
// "Instala o app" / cria um atalho do Brabo Studio no navegador.
export default function Root({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>Brabo Studio</title>
        <meta name="theme-color" content="#050506" />
        <meta name="description" content="Gestão financeira da Brabo Studio" />

        <link rel="manifest" href="/brabo-studio-mobile/manifest.json" />
        <link rel="icon" href="/brabo-studio-mobile/favicon.ico" />
        <link rel="icon" type="image/png" sizes="192x192" href="/brabo-studio-mobile/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/brabo-studio-mobile/icon-512.png" />
        <link rel="apple-touch-icon" href="/brabo-studio-mobile/apple-touch-icon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
