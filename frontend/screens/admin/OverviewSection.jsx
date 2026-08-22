import { useMemo } from 'react'
import { GROUP_STATUS, totals } from './groupStats.js'
import './adminTokens.css'
import './OverviewSection.css'

function Stat({ value, label, tone }) {
  return (
    <div className={`overview__stat${tone ? ` overview__stat--${tone}` : ''}`}>
      <span className="overview__stat-value">{value}</span>
      <span className="overview__stat-label">{label}</span>
    </div>
  )
}

function OverviewSection({ groups, onFilter }) {
  const stats = useMemo(() => totals(groups), [groups])

  return (
    <div className="overview">
      <section className="overview__block">
        <h2 className="overview__heading">Pessoas</h2>
        <div className="overview__stats">
          <Stat value={stats.yes} label="confirmadas" tone="yes" />
          <Stat value={stats.no} label="não vêm" tone="no" />
          <Stat value={stats.pending} label="sem resposta" tone="pending" />
          <Stat value={stats.people} label="cadastradas" />
        </div>
      </section>

      <section className="overview__block">
        <h2 className="overview__heading">Grupos</h2>
        <div className="overview__stats">
          <Stat value={stats.groups} label="cadastrados" />
          <Stat value={stats.answeredGroups} label="responderam" />
          <Stat value={stats.sent} label="convite enviado" />
        </div>
      </section>

      <section className="overview__block">
        <h2 className="overview__heading">Precisa da sua ação</h2>
        <div className="overview__actions">
          {/* "sem contato" e não "sem convite enviado": este número conta quem
              não recebeu convite E ainda não respondeu. A seção Envios conta
              cru quem não foi marcado como enviado, então os dois números
              divergem de propósito para quem respondeu sem o organizador ter
              marcado o check. Rótulos parecidos com contas diferentes fariam o
              painel se contradizer. */}
          <button
            type="button"
            className="overview__action"
            onClick={() => onFilter(GROUP_STATUS.naoEnviado)}
            disabled={stats.notSent === 0}
          >
            <span className="overview__action-value">{stats.notSent}</span>
            <span className="overview__action-label">
              {stats.notSent === 1 ? 'grupo ainda sem contato' : 'grupos ainda sem contato'}
            </span>
          </button>

          <button
            type="button"
            className="overview__action"
            onClick={() => onFilter(GROUP_STATUS.aguardando)}
            disabled={stats.waiting === 0}
          >
            <span className="overview__action-value">{stats.waiting}</span>
            <span className="overview__action-label">
              {stats.waiting === 1
                ? 'grupo recebeu e não respondeu'
                : 'grupos receberam e não responderam'}
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}

export default OverviewSection
