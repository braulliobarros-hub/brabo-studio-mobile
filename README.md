# Brabo Studio — App Mobile

App mobile da Brabo Studio (Expo / React Native), conectado ao banco de
dados na nuvem (Supabase) que criamos na Fase 1. Espelha as mesmas telas
do app desktop: Dashboard, Nova Transação, Histórico, Relatório Mensal
(com PDF), Lembretes e Clientes com foto.

## Passo 1 — Instalar as ferramentas (só na primeira vez)

Precisa ter o [Node.js](https://nodejs.org) instalado (versão 18 ou
mais recente). Depois, instala o app **Expo Go** no seu celular
(Android: Play Store / iPhone: App Store) — é por ele que você testa o
app em tempo real, sem precisar compilar nada.

## Passo 2 — Clonar e instalar

```bash
git clone <URL-do-seu-repositorio-no-GitHub>
cd brabo-studio-mobile
npm install
```

## Passo 3 — Configurar as chaves do Supabase

Esse projeto já vem com um arquivo `.env` preenchido com as chaves da
Fase 1 (Project URL e Publishable key). Se por algum motivo ele não
existir (por exemplo, se o `.env` ficou de fora do GitHub, que é o
esperado — ele está no `.gitignore` por segurança), copia o exemplo:

```bash
cp .env.example .env
```

E confere se os valores batem com o que está no seu arquivo
`FASE1_CREDENCIAIS.txt`.

## Passo 4 — Rodar

```bash
npx expo start
```

Vai abrir um QR code no terminal. Abre o app **Expo Go** no celular e
escaneia esse QR code (Android: opção de escanear dentro do próprio
Expo Go; iPhone: pela câmera nativa). O app abre na hora, direto no seu
celular, sem precisar instalar nada além do Expo Go.

Qualquer alteração que a gente fizer no código a partir de agora
aparece quase instantaneamente no celular (hot reload) — não precisa
reinstalar nada.

## Passo 5 — Login

Usa o mesmo e-mail e senha que criamos no Supabase na Fase 1
(está no `FASE1_CREDENCIAIS.txt`).

## Estrutura do projeto

```
app/
  _layout.js          → controla login vs. abas
  login.js            → tela de login
  (tabs)/
    _layout.js         → barra de navegação inferior
    index.js           → Dashboard
    nova.js            → Nova Transação
    historico.js        → Histórico
    relatorio.js        → Relatório Mensal (com exportar PDF)
    lembretes.js         → Lembretes de retorno (WhatsApp)
    clientes.js          → Lista de clientes com foto
lib/
  supabase.js         → conexão com o banco de dados na nuvem
  auth-context.js     → controle de login/logout
  queries.js          → todas as consultas ao banco (equivalente ao database.py)
  fotos.js            → upload/exibição de fotos de cliente
  constants.js        → listas de veículos, serviços, categorias
  format.js           → formatação de moeda e data
  theme.js            → cores da marca Brabo Studio
  ui.js               → componentes visuais reutilizáveis
assets/
  logo.png, icon.png, splash.png
```

## Publicar no GitHub

```bash
git init
git add .
git commit -m "Primeira versão do app mobile Brabo Studio"
git branch -M main
git remote add origin <URL-do-seu-repositorio>
git push -u origin main
```

**Importante:** o arquivo `.env` (com suas chaves reais) está no
`.gitignore` de propósito e **não vai** subir pro GitHub — mesmo que o
repositório seja público, suas chaves não ficam expostas ali. Só o
`.env.example` (sem valores reais preenchidos, exceto os que já são
seguros de compartilhar) vai junto.

## Gerar o app de verdade (EAS Build)

Quando estiver satisfeito testando pelo Expo Go, o próximo passo pra
ter um `.apk`/`.ipa` instalável (ou publicar nas lojas) é usar o EAS
Build, gratuito até um limite:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Isso gera um link pra baixar o `.apk` direto, sem precisar de loja
nenhuma — bom pra testar antes de decidir publicar de verdade.

## O que ainda pode evoluir (próximas iterações)

- Edição de transações existentes direto no Histórico (hoje dá pra
  excluir; editar ainda precisa ser feito criando um novo lançamento)
- Gráficos mais ricos no Dashboard
- Autocomplete de modelo do veículo com campo de texto livre além da
  lista fixa
- Notificação push automática de lembretes (hoje é preciso abrir o
  app pra ver quem está pra 15 dias)
