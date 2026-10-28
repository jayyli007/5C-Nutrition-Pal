import type { ReactNode } from 'react'

export const STEP_COLORS = ['bg-c-red', 'bg-c-orange', 'bg-c-yellow', 'bg-c-green', 'bg-c-blue']

export function StepHeader({ step, total, onBack }: { step: number; total: number; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-sm active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? STEP_COLORS[i % STEP_COLORS.length] : 'bg-line'}`} />
        ))}
      </div>
      <span className="shrink-0 text-xs text-muted tabular-nums">
        {step} of {total}
      </span>
    </div>
  )
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mt-7">
      <h1 className="font-display text-[32px] leading-[1.05] font-extrabold tracking-tight">{children}</h1>
      {sub && <p className="mt-2 text-[15px] text-muted">{sub}</p>}
    </div>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <p className="mt-6 mb-2.5 text-[15px] font-semibold">
      {children}
      {hint && <span className="font-normal text-muted"> {hint}</span>}
    </p>
  )
}

export function Chip({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-[15px] font-medium transition active:scale-[0.97] ${
        selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

export function PrimaryButton({ children, disabled, onClick, type = 'button' }: { children: ReactNode; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="h-14 w-full rounded-2xl bg-ink text-[17px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-35"
    >
      {children}
    </button>
  )
}

/** Phone-sized column with the primary action pinned to the bottom. */
export function Screen({ children, footer, style }: { children: ReactNode; footer?: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pt-[max(env(safe-area-inset-top),12px)]" style={style}>
      <div className="flex-1 pb-6">{children}</div>
      {footer && <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-paper from-70% to-transparent px-5 pt-6 pb-[max(env(safe-area-inset-bottom),20px)]">{footer}</div>}
    </div>
  )
}
