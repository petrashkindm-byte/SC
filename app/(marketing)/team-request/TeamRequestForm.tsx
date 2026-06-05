'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function TeamRequestForm() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    // Simulate send — replace with real API call when ready
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#161148', marginBottom: 10 }}>
          Заявка отправлена
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 28px' }}>
          Мы получили вашу заявку и свяжемся в ближайшие рабочие дни. Спасибо!
        </p>
        <Link href="/#pricing" style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', textDecoration: 'none' }}>
          ← Вернуться к тарифам
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="tr-field">
        <label htmlFor="company">Название компании или команды <span aria-hidden="true">*</span></label>
        <input className="tr-input" type="text" id="company" name="company" required autoComplete="organization" placeholder="ООО «Пример» или отдел маркетинга" />
      </div>

      <div className="tr-row">
        <div className="tr-field">
          <label htmlFor="name">Контактное лицо <span aria-hidden="true">*</span></label>
          <input className="tr-input" type="text" id="name" name="name" required autoComplete="name" placeholder="Имя и фамилия" />
        </div>
        <div className="tr-field">
          <label htmlFor="role">Должность / роль</label>
          <input className="tr-input" type="text" id="role" name="role" autoComplete="organization-title" placeholder="Например, CFO, руководитель IT" />
        </div>
      </div>

      <div className="tr-row">
        <div className="tr-field">
          <label htmlFor="email">Рабочий email <span aria-hidden="true">*</span></label>
          <input className="tr-input" type="email" id="email" name="email" required autoComplete="email" placeholder="you@company.ru" />
        </div>
        <div className="tr-field">
          <label htmlFor="phone">Телефон</label>
          <input className="tr-input" type="tel" id="phone" name="phone" autoComplete="tel" placeholder="+7 …" />
        </div>
      </div>

      <div className="tr-field">
        <label htmlFor="size">Размер команды (приблизительно)</label>
        <select className="tr-select" id="size" name="team_size">
          <option value="">Выберите вариант</option>
          <option value="2-10">2–10 человек</option>
          <option value="11-50">11–50</option>
          <option value="51-200">51–200</option>
          <option value="200+">Более 200</option>
        </select>
      </div>

      <div className="tr-field">
        <label htmlFor="goals">Для чего вам нужен SubCuro? <span aria-hidden="true">*</span></label>
        <textarea className="tr-textarea" id="goals" name="goals" required placeholder="Например: единый учёт подписок и связи по филиалам, контроль регулярных платежей, отчёты для финансов, разграничение доступа между отделами…" />
        <p className="tr-hint">Опишите сценарий и ожидания — чем конкретнее, тем лучше.</p>
      </div>

      <div className="tr-field">
        <label htmlFor="extra">Дополнительно</label>
        <textarea className="tr-textarea tr-textarea--short" id="extra" name="extra" placeholder="Сроки внедрения, интеграции, требования к безопасности — по желанию." />
      </div>

      <button type="submit" className="tr-submit" disabled={loading}>
        {loading ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </form>
  )
}
