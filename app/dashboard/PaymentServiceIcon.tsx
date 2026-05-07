import { getPaymentIconPreset, resolvePaymentIconIdForDisplay } from '@/lib/payment-icon-presets'

export type PaymentServiceIconShape = 'rounded' | 'circle' | 'square'

type Props = {
  icon: string | null | undefined
  categorySlug: string
  iconBg?: string | null
  shape?: PaymentServiceIconShape
  /** Внешний размер квадрата, px */
  size?: number
  className?: string
  title?: string
}

function shapeClass(shape: PaymentServiceIconShape): string {
  if (shape === 'circle') return 'rounded-full'
  if (shape === 'square') return 'rounded-[6px]'
  return 'rounded-[14px]'
}

export default function PaymentServiceIcon({
  icon,
  categorySlug,
  iconBg,
  shape = 'rounded',
  size = 48,
  className = '',
  title,
}: Props) {
  const id = resolvePaymentIconIdForDisplay(icon, categorySlug)
  const preset = getPaymentIconPreset(id)
  const bg = iconBg ?? preset?.bg ?? '#5b43d4'
  const html = preset?.h ?? ''
  const sh = shapeClass(shape)
  const glyph = Math.round(size * 0.52)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${sh} ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        boxShadow: '0 1px 2px rgba(26,26,61,0.12), inset 0 0 0 1px rgba(255,255,255,0.12)',
      }}
      title={title ?? preset?.label}
    >
      <span
        className="flex items-center justify-center [&>svg]:block"
        dangerouslySetInnerHTML={{
          __html: html.replace(
            /width="20" height="20"/,
            `width="${glyph}" height="${glyph}"`,
          ),
        }}
      />
    </span>
  )
}
