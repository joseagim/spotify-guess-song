import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet'
}

const BUTTON_STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-signal text-night hover:bg-[#5cf0a2] disabled:bg-fern disabled:text-sage',
  secondary: 'border border-fern text-mist hover:border-sage disabled:text-sage/60',
  quiet: 'text-sage hover:text-mist disabled:text-sage/50',
}

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  )
}

interface SegmentedOption<T extends string | number> {
  value: T
  label: ReactNode
}

interface SegmentedProps<T extends string | number> {
  label: string
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
}

/** Radio group rendered as a row of chips. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors ${
              selected ? 'bg-mist text-night' : 'bg-moss text-sage hover:text-mist'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function StatusDot({ tone }: { tone: 'ok' | 'busy' | 'off' | 'bad' }) {
  const color = {
    ok: 'bg-signal',
    busy: 'bg-amber animate-pulse motion-reduce:animate-none',
    off: 'bg-sage/50',
    bad: 'bg-coral',
  }[tone]
  return (
    <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${color}`} />
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm leading-relaxed text-coral">
      {children}
    </p>
  )
}
