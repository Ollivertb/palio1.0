# Garagem do Palio 🚗

PWA (Progressive Web App) para gerenciar manutenções, abastecimentos, lembretes, documentos e anotações do seu Fiat Palio 2010 ELX Flex.

## ✨ Funcionalidades

- **Manutenções**: Registre serviços, peças, km, data, custo e oficina
- **Abastecimentos**: Controle de litros, combustível (etanol/gasolina/misto), valor, posto e cálculo automático de consumo
- **Lembretes**: Alertas por km ou data (ex: troca de óleo, IPVA)
- **Documentos**: IPVA, seguro, licenciamento, multas com alertas de vencimento
- **Anotações**: Informações técnicas do carro (calibragem, códigos, medidas)
- **Ficha do carro**: Catálogo de informações técnicas (motor, pneus, óleo, filtros, etc.)
- **Assistente IA**: Registre por linguagem natural (texto ou voz) - "Troquei a correia dentada dia 10/11 com 85.000 km"
- **Gráficos**: Consumo por tanque, gastos mensais, próximas revisões
- **Sincronização GitHub**: Backup automático em repositório privado
- **Offline-first**: Funciona sem internet (Service Worker + Cache)
- **Instalável**: Adicione à tela inicial como app nativo
- **Tema claro/escuro**: Automático ou manual

## 🚀 Como rodar localmente

```bash
# Instalar dependências
npm install

# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📦 Deploy no GitHub Pages

O deploy é automático via **GitHub Actions** (`.github/workflows/deploy.yml`): todo push na `main` compila o app e publica a pasta `dist`.

**Configuração necessária (uma vez só):**

1. Vá em **Settings → Pages** no repositório.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Faça push na `main` (ou rode o workflow manualmente em **Actions → Deploy to GitHub Pages → Run workflow**).

O app fica disponível em `https://<usuario>.github.io/palio1.0/`. O workflow já define `VITE_BASE=/palio1.0/` para os caminhos funcionarem nesse subdiretório.

**Alternativa manual (branch `gh-pages`):**

```bash
npm run deploy
```

Depois selecione a branch `gh-pages` em **Settings → Pages**.

## 🔧 Configuração da Sincronização (GitHub)

1. Crie um **repositório privado** no GitHub (ex: `palio-data`)
2. Gere um **Personal Access Token** em [Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens/new) com escopo `repo`
3. No app, vá em **Mais → Sincronização** e preencha:
   - Repositório: `seu-usuario/palio-data`
   - Branch: `main`
   - Arquivo: `dados.json`
   - Token: `ghp_xxxxxxxxxxxx`
4. Toque em **Conectar e testar**

## 📁 Estrutura do Projeto

```
├── index.html              # Entry point
├── public/                 # Assets estáticos
│   ├── manifest.webmanifest
│   ├── sw.js              # Service Worker (gerado pelo Workbox)
│   └── icon.svg           # Ícone PWA
├── src/
│   ├── main.js            # Bootstrap da aplicação
│   ├── app.js             # Controller principal (roteamento, estado global)
│   ├── store.js           # Gerenciamento de estado (localStorage + GitHub)
│   ├── components/        # Componentes de UI
│   │   ├── Header.js
│   │   ├── Nav.js
│   │   ├── Fab.js
│   │   ├── ChatBar.js
│   │   ├── Modal.js
│   │   ├── FormModal.js
│   │   ├── Home.js
│   │   ├── List.js
│   │   ├── Chat.js
│   │   ├── Mais.js
│   │   ├── Ficha.js
│   │   ├── Backup.js
│   │   ├── Sync.js
│   │   └── Intervals.js
│   ├── utils/             # Utilitários
│   │   ├── helpers.js
│   │   ├── date.js
│   │   ├── format.js
│   │   ├── validation.js
│   │   ├── icons.js
│   │   ├── storage.js
│   │   └── github-sync.js
│   └── styles/            # CSS modular
│       ├── main.css
│       ├── variables.css
│       ├── base.css
│       ├── components.css
│       └── layout.css
├── package.json
├── vite.config.js
└── README.md
```

## 🛠️ Tecnologias

- **Vanilla JS** (ES Modules) - Sem frameworks, leve e rápido
- **Vite** - Build tool moderno e rápido
- **Workbox** - Service Worker para PWA/offline
- **CSS Custom Properties** - Temas dinâmicos
- **IndexedDB (via idb)** - Armazenamento offline robusto
- **GitHub API** - Sincronização remota
- **Web Speech API** - Ditado por voz

## 📱 PWA Features

- ✅ Installable (Add to Home Screen)
- ✅ Offline support
- ✅ Background sync (quando online)
- ✅ Push notifications (futuro)
- ✅ Responsive (mobile + desktop)
- ✅ Safe area insets (notch/dynamic island)

## 🎨 Temas

O app detecta automaticamente `prefers-color-scheme` e permite alternância manual. As cores são definidas em `src/styles/variables.css` via CSS Custom Properties.

## 🔒 Privacidade

- Dados ficam **apenas no seu navegador** (localStorage)
- Sincronização opcional via **seu repositório GitHub privado**
- Nenhum dado enviado para servidores terceiros
- Funciona 100% offline

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

Desenvolvido para o Fiat Palio 2010 ELX Flex ❤️