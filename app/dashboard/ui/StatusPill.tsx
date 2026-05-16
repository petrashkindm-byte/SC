type PillTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary'

const TONE_CLASS: Record<PillTone, string> = {
  success: 'bg-[#e4f6ec] text-[#0f8f54]',
  warning: 'bg-[#ffeadd] text-[#b35a00]',
  danger: 'bg-[#fde7ea] text-[#d94851]',
  neutral: 'bg-[#ececf0] text-[#6b6b80]',
  primary: 'bg-[#ede9fc] text-[#5b43d4]',
}

export default function StatusPill({
  label,
  tone,
  className = '',
}: {
  label: string
  tone: PillTone
  className?: string
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]} ${className}`}>
      {label}
    </span>
  )
}
