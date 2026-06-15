// Минимальный loader-хук для запуска модулей `lib/` отдельным процессом Node:
// переписывает спецификаторы вида `@/lib/...` (алиас из tsconfig.json, который
// понимает только сборщик Next.js) в файловые URL относительно корня проекта.

const projectRoot = new URL('../', import.meta.url)

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const path = specifier.slice(2)
    const withExt = /\.[a-z]+$/i.test(path) ? path : `${path}.ts`
    const target = new URL(withExt, projectRoot)
    return nextResolve(target.href, context)
  }
  return nextResolve(specifier, context)
}
