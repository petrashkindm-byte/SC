// Проверка данных и алгоритма сравнения сервисов (`lib/service-comparison-db.ts`).
//
// `service-comparison-db.ts` импортирует `@/lib/currency` — алиас, который
// понимает только сборщик Next.js. Чтобы запускать проверку отдельным
// процессом Node (как и `validate-subscription-templates.ts`), регистрируем
// крошечный loader-хук, переписывающий `@/...` в файловые пути проекта.
import { register } from 'node:module'

register('./lib-alias-loader.mjs', import.meta.url)

const {
  SERVICE_DB,
  findServiceMatches,
  getComparisonCandidates,
} = await import('../lib/service-comparison-db.ts')

type Issue = string

const issues: Issue[] = []

function check(condition: boolean, message: string) {
  if (!condition) issues.push(message)
}

function entryById(id: string) {
  return SERVICE_DB.find((e) => e.id === id)
}

// ─── Apple Fitness+ guard ──────────────────────────────────────────────────
// Если в базе появится фитнес-сервис, он не должен унаследовать
// `music_streaming` через дефолтный маппинг по `type` — у фитнес-сервисов
// должна быть явная классификация `fitness`/`health_wellness`.
for (const entry of SERVICE_DB) {
  const looksLikeFitness = /fitness/i.test(entry.id) || entry.names.some((n) => /fitness/i.test(n))
  if (!looksLikeFitness) continue
  check(
    entry.primaryComparisonGroup === 'fitness' || entry.primaryComparisonGroup === 'health_wellness',
    `${entry.id}: похож на фитнес-сервис, но primaryComparisonGroup = ${entry.primaryComparisonGroup} (ожидался 'fitness' или 'health_wellness')`,
  )
}

// ─── YouTube Premium — бандл, а не прямой конкурент YouTube Music ─────────
const youtubeMusic = entryById('youtube-music')
const youtubePremium = entryById('youtube-premium')
check(!!youtubeMusic && !!youtubePremium, 'youtube-music / youtube-premium: записи не найдены в SERVICE_DB')
if (youtubeMusic && youtubePremium) {
  const candidates = getComparisonCandidates(youtubeMusic, SERVICE_DB)
  const premiumCandidate = candidates.find((c) => c.entry.id === 'youtube-premium')
  check(
    premiumCandidate?.role === 'bundle',
    `youtube-music: YouTube Premium должен входить кандидатом с role 'bundle' (получено: ${premiumCandidate?.role ?? 'не найден'})`,
  )
}

// ─── Яндекс Плюс — экосистемный бандл ──────────────────────────────────────
const yandexPlus = entryById('yandex-plus')
check(!!yandexPlus, 'yandex-plus: запись не найдена в SERVICE_DB')
if (yandexPlus) {
  check(
    yandexPlus.primaryComparisonGroup === 'ecosystem_bundle',
    `yandex-plus: primaryComparisonGroup = ${yandexPlus.primaryComparisonGroup} (ожидался 'ecosystem_bundle')`,
  )
  check(yandexPlus.isBundle === true, `yandex-plus: isBundle = ${yandexPlus.isBundle} (ожидался true)`)
}

// ─── Spotify ↔ Яндекс Плюс — валидная пара для сравнения ──────────────────
const spotify = entryById('spotify')
check(!!spotify, 'spotify: запись не найдена в SERVICE_DB')
if (spotify && yandexPlus) {
  const candidates = getComparisonCandidates(spotify, SERVICE_DB)
  const plusCandidate = candidates.find((c) => c.entry.id === 'yandex-plus')
  check(
    plusCandidate?.role === 'direct_competitor' || plusCandidate?.role === 'bundle' || plusCandidate?.role === 'alternative',
    `spotify ↔ yandex-plus: ожидалась сравнимая пара (direct_competitor/bundle/alternative), получено: ${plusCandidate?.role ?? 'not found / not_comparable'}`,
  )
}

// ─── Захардненный матчинг — не должен ложно угадывать по общим словам ─────
const plusMatches = findServiceMatches('plus', 3)
check(
  plusMatches[0]?.entry.id !== 'yandex-plus',
  `findServiceMatches('plus'): на первом месте оказался yandex-plus (score ${plusMatches[0]?.score}) — слишком общее слово не должно топ-ранжировать "Яндекс Плюс"`,
)

const proMatches = findServiceMatches('pro', 3)
check(
  proMatches.length === 0 || proMatches[0].score < 60,
  `findServiceMatches('pro'): вернул уверенное совпадение "${proMatches[0]?.entry.id}" (score ${proMatches[0]?.score}) — общее слово "pro" не должно давать конкретный результат`,
)

const chatgptMatches = findServiceMatches('chatgpt', 3)
check(
  chatgptMatches[0]?.entry.id === 'chatgpt-plus',
  `findServiceMatches('chatgpt'): ожидался top-ранг 'chatgpt-plus', получено: ${chatgptMatches[0]?.entry.id ?? 'ничего'}`,
)

// ─── Итог ──────────────────────────────────────────────────────────────────
if (issues.length === 0) {
  console.log(`✓ ${SERVICE_DB.length} записей SERVICE_DB и алгоритм сравнения прошли проверку без замечаний.`)
  process.exit(0)
}

console.error(`✗ Найдено ${issues.length} замечаний:\n`)
for (const issue of issues) {
  console.error(`  - ${issue}`)
}
process.exit(1)
