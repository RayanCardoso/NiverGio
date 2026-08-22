import { useEffect, useState } from 'react'
import './adminTokens.css'
import './GroupForm.css'

function GroupForm({ group, onSubmit, onCancel }) {
  const [responsible, setResponsible] = useState('')
  const [phone, setPhone] = useState('')
  const [companions, setCompanions] = useState([])
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Recarrega os campos quando muda o grupo editado — inclusive ao voltar para
  // o cadastro, que é `group === null`. Sem isso, editar um grupo e cancelar
  // deixaria os campos sujos com os dados dele.
  useEffect(() => {
    const members = (group && group.members) || []
    const head = members.find((member) => member.is_responsible)

    setResponsible(head ? head.name : '')
    setPhone((group && group.phone) || '')
    setCompanions(
      members
        .filter((member) => !member.is_responsible)
        .map((member) => ({ id: member.id, name: member.name })),
    )
    setErrorMessage('')
  }, [group])

  const changeCompanion = (index, name) => {
    setCompanions((prev) => prev.map((item, i) => (i === index ? { ...item, name } : item)))
  }

  const removeCompanion = (index) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    try {
      await onSubmit({
        responsible: responsible.trim(),
        phone: phone.trim(),
        // Acompanhante que já existe vai com o id: é isso que faz o backend
        // renomear em vez de recriar, preservando quem já respondeu.
        companions: companions
          .filter((item) => item.name.trim() !== '')
          .map((item) => (item.id ? { id: item.id, name: item.name.trim() } : { name: item.name.trim() })),
      })
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="group-form" onSubmit={handleSubmit}>
      <h2 className="group-form__title">{group ? 'Editar grupo' : 'Cadastrar grupo'}</h2>

      <div className="group-form__fields">
        <label className="group-form__field">
          <span className="group-form__label">Responsável</span>
          <input
            className="group-form__input"
            value={responsible}
            onChange={(event) => setResponsible(event.target.value)}
            placeholder="Nome de quem recebe o convite"
            maxLength={120}
            required
          />
        </label>

        <label className="group-form__field">
          <span className="group-form__label">
            WhatsApp <span className="group-form__optional">(opcional)</span>
          </span>
          <input
            className="group-form__input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(21) 96539-7036"
            inputMode="tel"
            maxLength={20}
          />
        </label>
      </div>

      <p className="group-form__label">Acompanhantes</p>

      {companions.length === 0 && (
        <p className="group-form__empty">Ninguém além do responsável, por enquanto.</p>
      )}

      <ul className="group-form__companions">
        {companions.map((companion, index) => (
          <li className="group-form__companion" key={companion.id || `novo-${index}`}>
            <input
              className="group-form__input"
              value={companion.name}
              onChange={(event) => changeCompanion(index, event.target.value)}
              placeholder="Nome do acompanhante"
              maxLength={120}
            />
            <button
              type="button"
              className="group-form__remove"
              onClick={() => removeCompanion(index)}
              aria-label={`Remover ${companion.name || 'acompanhante'}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="group-form__add"
        onClick={() => setCompanions((prev) => [...prev, { id: 0, name: '' }])}
      >
        + Adicionar acompanhante
      </button>

      {errorMessage && <p className="group-form__error">{errorMessage}</p>}

      <div className="group-form__actions">
        <button type="submit" className="group-form__submit" disabled={saving}>
          {saving ? 'Salvando…' : group ? 'Salvar alterações' : 'Cadastrar grupo'}
        </button>
        {group && (
          <button type="button" className="group-form__cancel" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

export default GroupForm
