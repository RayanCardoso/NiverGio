// Status derivado de um grupo e os totais do painel. Em um arquivo só porque
// Visão geral, Convidados e Envios mostram os mesmos números: três cópias da
// conta acabariam divergindo em cima da mesma tabela.

export const GROUP_STATUS = {
  naoEnviado: 'nao-enviado',
  aguardando: 'aguardando',
  parcial: 'parcial',
  respondido: 'respondido',
}

export const GROUP_STATUS_LABEL = {
  [GROUP_STATUS.naoEnviado]: 'Não enviado',
  [GROUP_STATUS.aguardando]: 'Aguardando',
  [GROUP_STATUS.parcial]: 'Parcial',
  [GROUP_STATUS.respondido]: 'Respondido',
}

// A resposta vem antes do envio na ordem dos testes de propósito: se a família
// respondeu e o organizador esqueceu de marcar o check, o que interessa a ele é
// "respondido", não "não enviado".
export function groupStatus(group) {
  const members = group.members || []
  const answered = members.filter((member) => member.status !== 'pending').length

  if (members.length > 0 && answered === members.length) return GROUP_STATUS.respondido
  if (answered > 0) return GROUP_STATUS.parcial
  if (!group.message_sent_at) return GROUP_STATUS.naoEnviado
  return GROUP_STATUS.aguardando
}

export function responsibleName(group) {
  const responsible = (group.members || []).find((member) => member.is_responsible)
  return responsible ? responsible.name : '—'
}

export function groupScore(group) {
  const members = group.members || []
  return {
    total: members.length,
    yes: members.filter((member) => member.status === 'yes').length,
    no: members.filter((member) => member.status === 'no').length,
    pending: members.filter((member) => member.status === 'pending').length,
  }
}

export function totals(groups) {
  return (groups || []).reduce(
    (acc, group) => {
      const score = groupScore(group)
      const status = groupStatus(group)
      return {
        people: acc.people + score.total,
        yes: acc.yes + score.yes,
        no: acc.no + score.no,
        pending: acc.pending + score.pending,
        groups: acc.groups + 1,
        answeredGroups: acc.answeredGroups + (status === GROUP_STATUS.respondido ? 1 : 0),
        sent: acc.sent + (group.message_sent_at ? 1 : 0),
        notSent: acc.notSent + (status === GROUP_STATUS.naoEnviado ? 1 : 0),
        waiting: acc.waiting + (status === GROUP_STATUS.aguardando ? 1 : 0),
      }
    },
    {
      people: 0,
      yes: 0,
      no: 0,
      pending: 0,
      groups: 0,
      answeredGroups: 0,
      sent: 0,
      notSent: 0,
      waiting: 0,
    },
  )
}
