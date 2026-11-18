import type { ReactNode } from 'react'
import { BACKGROUNDS, TRACKABLES, type BackgroundId, type TrackableId } from '../onboarding'

export type Tab = 'stats' | 'today' | 'me'

/**
 * A main app screen: the user's gradient behind a phone-width column.
 * `tabs` shows the Stats / Log / Me bar; `footer` pins an action to the bottom instead.
 */
export function Page({
  background,
  children,
  tab,
  onTab,
  footer,
}: {
  background: BackgroundId
  children: ReactNode
  tab?: Tab
  onTab?: (t: Tab) => void
  footer?: ReactNode
}) {
  const bg = BACKGROUNDS.find((b) => b.id === background)?.css ?? BACKGROUNDS[0].css
  return (
    <div className="relative min-h-dvh">
      <div className="fixed inset-0 -z-10" style={{ background: bg }} aria-hidden="true" />
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pt-[max(env(safe-area-inset-top),16px)]">
        <div className={`flex-1 ${tab ? 'pb-28' : 'pb-6'}`}>{children}</div>
        {footer && <div className="sticky bottom-0 -mx-5 bg-white/45 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] backdrop-blur-md">{footer}</div>}
      </div>
      {tab && onTab && <TabBar tab={tab} onTab={onTab} />}
    </div>
  )
}

function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'stats', label: 'Stats', icon: <path d="M6 20v-6M12 20V5M18 20v-9" /> },
    {
      id: 'today',
      label: 'Log',
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </>
      ),
    },
    {
      id: 'me',
      label: 'Me',
      icon: (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
        </>
      ),
    },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[440px] pb-[max(env(safe-area-inset-bottom),6px)]">
        {items.map((it) => {
          const on = it.id === tab
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onTab(it.id)}
              aria-current={on ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1.5 text-[12px] ${on ? 'font-semibold text-ink' : 'text-muted'}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {it.icon}
              </svg>
              {it.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>{children}</div>
}

export function BackTitle({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <button type="button" onClick={onBack} aria-label="Back" className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-sm active:scale-95">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-tight">{children}</h1>
    </div>
  )
}

/** iOS-style segmented control. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-2xl bg-black/[0.06] p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={`h-10 flex-1 rounded-xl text-[14px] font-medium transition ${o === value ? 'bg-white font-semibold shadow-sm' : 'text-ink/70'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mt-5 mb-2 text-[12px] font-semibold tracking-[0.08em] text-ink/60 uppercase">{children}</p>
}

/** One ring per tracked nutrient, outermost first, filled to total / goal. */
export function NutrientRings({ ids, totals, goals, size = 168 }: { ids: TrackableId[]; totals: Record<TrackableId, number>; goals: Record<TrackableId, number>; size?: number }) {
  const width = Math.max(4, Math.min(9, 44 / Math.max(ids.length, 1)))
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Today's nutrients against your goals">
      <circle cx="50" cy="50" r="49" fill="white" fillOpacity="0.55" />
      {ids.map((id, i) => {
        const color = TRACKABLES.find((t) => t.id === id)!.color
        const r = 45 - width / 2 - i * (width + 1.5)
        const c = 2 * Math.PI * r
        const pct = Math.min(1, goals[id] ? totals[id] / goals[id] : 0)
        return (
          <g key={id} transform="rotate(-90 50 50)">
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeOpacity="0.2" strokeWidth={width} />
            {pct > 0 && (
              <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${Math.max(c * pct, 0.01)} ${c}`} className="transition-[stroke-dasharray] duration-700" />
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function Check({ className = 'size-6' }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-c-green text-white ${className}`}>
      <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  )
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

export function Flame({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 14 16" aria-hidden="true" className="self-center">
      <path d="M7 0c.5 3-2 4.5-3.5 6.5C2.3 8 2 9.3 2 10.5 2 13.5 4.2 16 7 16s5-2.5 5-5.5c0-2.2-1-3.6-2-4.7.1 1.6-.6 2.7-1.6 3C8.9 6 8.6 2.4 7 0Z" fill="#f2803a" />
    </svg>
  )
}
