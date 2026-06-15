import type { SubscriptionPlanTemplate, SubscriptionTemplate } from './types.ts'

export interface ValidationIssue {
  templateId: string
  planId?: string
  rule: string
  message: string
}

function issue(template: SubscriptionTemplate, rule: string, message: string, planId?: string): ValidationIssue {
  return { templateId: template.id, planId, rule, message }
}

/**
 * Проверки целостности данных шаблонов подписок (раздел 11 ТЗ).
 * Главный принцип: автоподстановка суммы допустима только когда
 * мы по-настоящему уверены в цифре и регионе пользователя.
 */
export function validateSubscriptionTemplates(templates: SubscriptionTemplate[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const seenTemplateIds = new Set<string>()
  const seenPlanIds = new Set<string>()

  for (const template of templates) {
    // 1. Уникальность id шаблона и id планов
    if (seenTemplateIds.has(template.id)) {
      issues.push(issue(template, 'unique-template-id', `Дублирующийся id шаблона: ${template.id}`))
    }
    seenTemplateIds.add(template.id)

    if (template.plans.length === 0) {
      issues.push(issue(template, 'has-plans', 'У шаблона нет ни одного тарифа (plans пуст)'))
    }

    for (const plan of template.plans) {
      if (seenPlanIds.has(plan.id)) {
        issues.push(issue(template, 'unique-plan-id', `Дублирующийся id тарифа: ${plan.id}`, plan.id))
      }
      seenPlanIds.add(plan.id)

      validatePlan(template, plan, issues)
    }

    validateTemplateLevel(template, issues)
  }

  return issues
}

function validatePlan(template: SubscriptionTemplate, plan: SubscriptionPlanTemplate, issues: ValidationIssue[]) {
  const id = plan.id

  // 2. amount === 0 допустим только при amount_type 'free'
  if (plan.amount === 0 && plan.amount_type !== 'free') {
    issues.push(issue(template, 'zero-amount-requires-free', 'amount=0 допустим только при amount_type="free"', id))
  }

  // 3. amount !== null требует не-unknown amount_type
  if (plan.amount !== null && plan.amount_type === 'unknown') {
    issues.push(issue(template, 'amount-requires-known-type', 'amount задан, но amount_type="unknown"', id))
  }

  // amount === null не должен иметь amount_type, подразумевающий конкретное число
  if (plan.amount === null && (plan.amount_type === 'fixed' || plan.amount_type === 'promo')) {
    issues.push(issue(template, 'null-amount-requires-uncertain-type', 'amount=null несовместим с amount_type="fixed"/"promo"', id))
  }

  // 4. currency должна быть согласована с amount
  if (plan.amount !== null && plan.amount > 0 && !plan.currency) {
    issues.push(issue(template, 'amount-requires-currency', 'amount задан и больше нуля, но currency отсутствует', id))
  }
  if (plan.amount === null && plan.currency) {
    issues.push(issue(template, 'no-amount-no-currency', 'currency задана, но amount=null', id))
  }

  // 5. RUB-цена для глобального сервиса требует явного региона RU и пометки
  if (plan.currency === 'RUB' && !plan.region.includes('RU')) {
    issues.push(issue(template, 'rub-requires-ru-region', 'currency="RUB", но регион не включает "RU"', id))
  }

  // 6. license ⇒ платёж разовый (one_time)
  if (template.payment_model === 'license' && plan.billing_cycle !== 'one_time') {
    issues.push(issue(template, 'license-requires-one-time', 'payment_model="license", но billing_cycle тарифа не "one_time"', id))
  }
  if (template.payment_model === 'license' && plan.amount_type !== 'one_time' && plan.amount_type !== 'unknown') {
    issues.push(issue(template, 'license-amount-type', 'payment_model="license" предполагает amount_type "one_time" (или "unknown", если цена не известна)', id))
  }

  // 7. free ⇒ amount 0 или null, без автоподстановки ненулевой суммы
  if (template.payment_model === 'free') {
    if (!(plan.amount === 0 || plan.amount === null)) {
      issues.push(issue(template, 'free-requires-zero-or-null-amount', 'payment_model="free", но amount не равен 0 и не null', id))
    }
    if (plan.amount_type !== 'free' && plan.amount_type !== 'unknown') {
      issues.push(issue(template, 'free-amount-type', 'payment_model="free" предполагает amount_type "free" (или "unknown")', id))
    }
  }

  // 8. низкая/неизвестная уверенность ⇒ нельзя автозаполнять
  if ((plan.price_confidence === 'low' || plan.price_confidence === 'unknown') && template.should_autofill_amount) {
    issues.push(issue(template, 'low-confidence-no-autofill', 'price_confidence="low"/"unknown" несовместимо с should_autofill_amount=true', id))
  }

  // approximate/from/promo тоже не должны автозаполняться (только "fixed")
  if (plan.amount_type !== 'fixed' && template.should_autofill_amount) {
    issues.push(issue(template, 'autofill-requires-fixed-amount-type', 'should_autofill_amount=true требует amount_type="fixed" у основного тарифа', id))
  }

  // 11. платный сервис без pricing_url не может быть "verified"
  const isPaid = plan.amount !== null && plan.amount > 0
  if (isPaid && !template.pricing_url && plan.price_confidence === 'verified') {
    issues.push(issue(template, 'verified-requires-pricing-url', 'price_confidence="verified" для платного тарифа требует pricing_url как источник', id))
  }
}

function validateTemplateLevel(template: SubscriptionTemplate, issues: ValidationIssue[]) {
  const mainPlan = template.plans[0]
  if (!mainPlan) return

  // 9 & 10. should_autofill_amount=true допустимо только если основной план
  // зафиксирован, проверен/высокого доверия и применим к региону RU
  if (template.should_autofill_amount) {
    if (mainPlan.amount === null) {
      issues.push(issue(template, 'autofill-requires-amount', 'should_autofill_amount=true, но amount основного тарифа не задан'))
    }
    if (mainPlan.amount_type !== 'fixed') {
      issues.push(issue(template, 'autofill-requires-fixed', 'should_autofill_amount=true требует amount_type="fixed" у основного тарифа'))
    }
    if (mainPlan.price_confidence !== 'verified' && mainPlan.price_confidence !== 'high') {
      issues.push(issue(template, 'autofill-requires-confidence', 'should_autofill_amount=true требует price_confidence "verified" или "high"'))
    }
    if (!mainPlan.region.includes('RU') && !mainPlan.region.includes('GLOBAL')) {
      issues.push(issue(template, 'autofill-requires-matching-region', 'should_autofill_amount=true, но основной тариф не покрывает регион пользователя (RU)'))
    }
  }

  // is_bundle ⇒ included_services заполнен
  if (template.is_bundle && (!template.included_services || template.included_services.length === 0)) {
    issues.push(issue(template, 'bundle-requires-included-services', 'is_bundle=true, но included_services не заполнен'))
  }

  // user_warning обязателен, когда автоподстановка невозможна, но цена всё же есть
  if (!template.should_autofill_amount && mainPlan.amount !== null && mainPlan.amount > 0 && !template.user_warning) {
    issues.push(issue(template, 'uncertain-price-requires-warning', 'Цена указана, но автоподстановка отключена и user_warning отсутствует — пользователь не будет предупреждён'))
  }
}
