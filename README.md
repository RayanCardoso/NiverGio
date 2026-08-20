# Convite de Aniversário — Tema Enrolados 👑

Site em React (Vite) com duas etapas:

1. **Página do vídeo** — mostra `video.mp4` em tela cheia. Ao clicar em qualquer lugar o vídeo começa a tocar (sem botão de play). Quando termina, avança automaticamente para a página de informações.
2. **Página de informações** — imagem principal, dica "arraste para mais informações", data/hora estilizada com contagem regressiva, os 3 botões (Confirmar presença / Como chegar / Sugestões de presente) e o traje sugerido.

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

## O que você precisa configurar

### 1. Arquivos de mídia (pasta `public/`)

Coloque nesta pasta:

- `video.mp4` — o vídeo da primeira página
- `imagem-principal.jpg` — a imagem principal (tema Enrolados) da segunda página

Enquanto esses arquivos não existirem, o site mostra um aviso (na página do vídeo) e uma ilustração de torre de placeholder (na página de informações), então nada quebra.

### 2. Data, hora, traje e links dos botões

Tudo fica em [`src/config.js`](src/config.js):

- `EVENT_DATE` — data/hora reais da festa (usadas na contagem regressiva)
- `EVENT_DATE_LABEL` / `EVENT_TIME_LABEL` — texto exibido
- `DRESS_CODE` — traje sugerido
- `LINKS` — quando quiser ativar os botões, cole ali o link de cada ação (WhatsApp, Google Maps, lista de presentes). Enquanto estiver vazio, o botão mostra um aviso "em breve".

## Build para publicar

```bash
npm run build
```

Gera a pasta `dist/` pronta para subir em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages etc.). Lembre-se de incluir `video.mp4` e `imagem-principal.jpg` dentro de `public/` antes do build.
