import { Label, PrimaryButton, Screen, StepHeader, Title } from '../components/ui'
import { TRACKABLES, toggle } from '../onboarding'
import type { StepProps } from './types'

export function Tracking({ data, update, onNext, onBack, step, total }: StepProps) {
  const count = data.justMeals ? 0 : data.tracking.length
  return (
    <Screen
      footer={
        <>
          <p className="mb-3 text-center text-[13px] text-muted">You can change this anytime in Me.</p>
          <PrimaryButton disabled={!data.justMeals && data.tracking.length === 0} onClick={onNext}>
            Continue
          </PrimaryButton>
        </>
      }
    >
      <StepHeader step={step} total={total} onBack={onBack} />
      <Title sub="Pick as many as you like. Each one becomes a ring on Today.">What do you want to track?</Title>

      <div className="flex items-baseline justify-between">
        <Label>Nutrients</Label>
        <span className="text-[13px] text-muted tabular-nums">{count} selected</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {TRACKABLES.map((t) => {
          const on = !data.justMeals && data.tracking.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => update({ justMeals: false, tracking: toggle(data.justMeals ? [] : data.tracking, t.id) })}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border bg-white px-3.5 text-left transition active:scale-[0.98] ${
                on ? 'border-ink ring-1 ring-ink' : 'border-line'
              }`}
            >
              <span className="size-3 shrink-0 rounded-full" style={{ background: t.color }} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[15px] font-semibold">{t.label}</span>
                <span className="text-[12px] text-muted">{t.unit}</span>
              </span>
              {on && (
                <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-ink">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="my-3 text-center text-[13px] text-muted">or</p>
      <button
        type="button"
        role="checkbox"
        aria-checked={data.justMeals}
        onClick={() => update({ justMeals: !data.justMeals })}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-dashed px-4 text-[15px] font-medium transition ${
          data.justMeals ? 'border-solid border-ink bg-ink text-white' : 'border-[#b9b5ad]'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
        Just log meals, no numbers
      </button>
    </Screen>
  )
}
