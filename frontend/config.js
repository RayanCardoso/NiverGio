// ==========================================================================
// CONFIGURAÇÕES DA FESTA — edite só aqui.
// ==========================================================================

// Data e hora da festa. Formato: 'AAAA-MM-DDTHH:MM:SS'
// TODO: troque pela data e hora reais da festa.
export const EVENT_DATE = '2027-01-29T20:00:00'

// Textos exibidos na página de informações (data/hora estilizada).
export const EVENT_DATE_LABEL = '29 de Janeiro'
export const EVENT_TIME_LABEL = '20h'

// Traje sugerido.
export const DRESS_CODE = 'Social completo'

// Links dos botões. Deixe como '' para o botão avisar "em breve".
// TODO: configure os links reais quando estiverem prontos.
export const LINKS = {
  comoChegar: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    'Balroom Irajá, Ura Guiraréia, nº 370, Rio de Janeiro'
  )}`,
  // "Confirmar presença" e "Sugestões de presente" não usam link:
  // abrem páginas do próprio site (ConfirmPresencaPage / GiftsPage).
}

// Texto de introdução da página de sugestões de presentes.
export const GIFT_INTRO =
  'Sua presença é nosso maior presente. No entanto, caso tenha a intenção de me presentear, seguem abaixo algumas dicas'

// Itens sugeridos. O campo "icon" usa uma chave de src/components/GiftIcons.jsx
// (sneaker, shirt, shorts, rings, perfume, dress). Edite/adicione/remova livremente.
export const GIFT_SUGGESTIONS = [
  { icon: 'sneaker', label: 'Tênis', detail: 'tam: 37' },
  { icon: 'shirt', label: 'Camiseta', detail: 'tam: M' },
  { icon: 'shorts', label: 'Shorts', detail: 'tam: 36' },
  { icon: 'rings', label: 'Jóias', detail: '' },
  { icon: 'perfume', label: 'Perfume / hidratante', detail: '' },
  { icon: 'dress', label: 'Vestido', detail: 'tam: P' },
]

// Chave PIX exibida na página de presentes.
export const PIX_KEY = '21965397036'
