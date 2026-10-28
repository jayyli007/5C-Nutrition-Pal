import { PrimaryButton, Screen, StepHeader, Title } from '../components/ui'
import { TRACKABLES, toggle } from '../onboarding'
import type { StepProps } from './types'

export function Tracking({ data, update, onNext, onBack, step, total }: StepProps) {
  return (
    <Screen
      footer={
        <PrimaryButton disabled={data.tracking.length === 0} onClick={onNext}>
          Start logging
        </PrimaryButton>
      }
    >
      <StepHeader step={step} total={total} onBack={onBack} />
      <Title sub="Pick what shows up on Today. You can change this later in Me.">What do you want to track?</Title>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        {TRACKABLES.map((t, i) => {
          const on = data.tracking.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => update({ tracking: toggle(data.tracking, t.id) })}
              className={`flex min-h-14 w-full items-center justify-between px-4 text-left active:bg-paper ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <span className="text-[16px] font-medium">
                {t.label} <span className="text-[13px] font-normal text-muted">{t.hint}</span>
              </span>
              <span className={`grid size-6 place-items-center rounded-md border-2 transition ${on ? 'border-ink bg-ink' : 'border-line'}`}>
                {on && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
            </button>
          )
        })}
      </div>
      {data.tracking.length === 0 && <p className="mt-3 text-[13px] text-c-red">Pick at least one.</p>}
    </Screen>
  )
}
