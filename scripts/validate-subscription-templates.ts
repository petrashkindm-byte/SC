import { CURATED_TEMPLATES } from '../lib/subscription-templates/curated-entries.ts'
import { validateSubscriptionTemplates, type ValidationIssue } from '../lib/subscription-templates/validate.ts'

// Проверяем только курируемые вручную шаблоны: записи, адаптированные из
// легаси-каталога (`legacy-adapter.ts`), всегда получают консервативные
// флаги программно (`price_confidence: 'low'`, `should_autofill_amount: false`)
// и не могут нарушить эти правила. Импортировать сам легаси-каталог сюда
// нельзя — он использует алиасы `@/...`, которые не резолвятся вне сборщика
// Next.js, а инструмент должен запускаться отдельным процессом Node.
const issues = validateSubscriptionTemplates(CURATED_TEMPLATES)

if (issues.length === 0) {
  console.log(`✓ ${CURATED_TEMPLATES.length} курируемых шаблонов подписок прошли проверку без замечаний.`)
  process.exit(0)
}

const byTemplate = new Map<string, ValidationIssue[]>()
for (const iss of issues) {
  const list = byTemplate.get(iss.templateId) ?? []
  list.push(iss)
  byTemplate.set(iss.templateId, list)
}

console.error(`✗ Найдено ${issues.length} замечаний в ${byTemplate.size} шаблонах:\n`)
for (const [templateId, templateIssues] of byTemplate) {
  console.error(`  ${templateId}`)
  for (const iss of templateIssues) {
    const planSuffix = iss.planId ? ` [план: ${iss.planId}]` : ''
    console.error(`    - (${iss.rule})${planSuffix} ${iss.message}`)
  }
}

process.exit(1)
