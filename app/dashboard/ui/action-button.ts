type ActionVariant = 'primary' | 'success' | 'secondary' | 'danger' | 'ghost'
type ActionSize = 'sm' | 'md'

const VARIANT_CLASS: Record<ActionVariant, string> = {
  primary: 'bg-[#5b43d4] text-white shadow-[0_4px_14px_rgba(91,67,212,0.35)] hover:brightness-105',
  success: 'bg-[#0d9f6e] text-white shadow-[0_4px_14px_rgba(13,159,110,0.3)] hover:brightness-105',
  secondary: 'border border-[rgba(26,26,61,0.12)] bg-white text-[#1a1a2e] hover:bg-[#f8f6f2]',
  danger: 'border border-[#f0c0c3] bg-white text-[#c24f00] hover:bg-[#fff4eb]',
  ghost: 'border border-[rgba(26,26,61,0.08)] bg-white text-[#1a1a2e] hover:border-[#5b43d4]',
}

const SIZE_CLASS: Record<ActionSize, string> = {
  sm: 'rounded-lg px-3 py-2 text-xs font-semibold',
  md: 'rounded-xl h-11 px-4 text-sm font-semibold inline-flex items-center justify-center',
}

export function actionButtonClass(variant: ActionVariant, size: ActionSize = 'md'): string {
  return `${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]}`
}
