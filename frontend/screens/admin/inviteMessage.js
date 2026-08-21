import {
  SITE_URL,
  INVITE_MESSAGE,
  EVENT_DATE_LABEL,
  EVENT_TIME_LABEL,
  DRESS_CODE,
} from '../../config.js'

// O link cai na raiz, não em /confirmacao: assim a família vê o vídeo de
// abertura, e o "?c=" atravessa a troca de rota junto.
export function inviteLink(guid) {
  return `${SITE_URL.replace(/\/+$/, '')}/?c=${guid}`
}

export function inviteMessage({ name, guid }) {
  return INVITE_MESSAGE.replaceAll('{nome}', name)
    .replaceAll('{link}', inviteLink(guid))
    .replaceAll('{data}', EVENT_DATE_LABEL)
    .replaceAll('{hora}', EVENT_TIME_LABEL)
    .replaceAll('{traje}', DRESS_CODE)
}

// O wa.me exige só dígitos e com código do país. O organizador digita o número
// como quiser, então o 55 entra aqui — e a decisão é pelo TAMANHO, não pelo
// começo: um celular de DDD 55 (Santa Maria) começa com 55 e mesmo assim
// precisa do código do país na frente.
export function whatsappUrl({ phone, message }) {
  const digits = String(phone || '').replace(/\D+/g, '')
  if (!digits) return ''

  const withCountry = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}
