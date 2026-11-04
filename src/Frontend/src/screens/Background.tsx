import { PrimaryButton, Screen, StepHeader, Title } from '../components/ui'
import { BACKGROUNDS } from '../onboarding'
import type { StepProps } from './types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Rings() {
  const rings = [
    { r: 40, color: '#e5484d', pct: 0.72 },
    { r: 31, color: '#f2803a', pct: 0.55 },
    { r: 22, color: '#3b82f6', pct: 0.8 },
  ]
  return (
    <svg viewBox="0 0 100 100" className="size-28">
      {rings.map(({ r, color, pct }) => {
        const c = 2 * Math.PI * r
        return (
          <g key={r} transform="rotate(-90 50 50)">
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="7" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
          </g>
        )
      })}
    </svg>
  )
}

export function Background({ data, update, onNext, onBack, step, total }: StepProps) {
  const selected = BACKGROUNDS.find((b) => b.id === data.background) ?? BACKGROUNDS[0]
  return (
    <Screen footer={<PrimaryButton onClick={onNext}>Continue</PrimaryButton>}>
      <StepHeader step={step} total={total} onBack={onBack} />
      <Title sub="Choose a gradient for your app. You can change it later in Me.">Pick your background</Title>

      <div
        className="mx-auto mt-6 flex w-52 flex-col items-center rounded-[28px] border border-black/5 p-4 shadow-sm transition-[background] duration-300"
        style={{ background: selected.css }}
      >
        <p className="font-display text-[15px] font-semibold">Today · {DAYS[new Date().getDay()]}</p>
        <Rings />
        {['Breakfast', 'Lunch'].map((m) => (
          <div key={m} className="mt-2 flex w-full justify-between rounded-lg bg-white/90 px-3 py-2 text-[11px] font-semibold">
            <span>{m}</span>
            <span>560 kcal</span>
          </div>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-4 gap-x-3 gap-y-4" role="radiogroup" aria-label="Background">
        {BACKGROUNDS.map((b) => {
          const isSel = b.id === data.background
          return (
            <button key={b.id} type="button" role="radio" aria-checked={isSel} onClick={() => update({ background: b.id })} className="flex flex-col items-center gap-1.5">
              <span
                className={`aspect-square w-full rounded-2xl border transition ${isSel ? 'border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'border-line'}`}
                style={{ background: b.css }}
              />
              <span className="text-[13px]">{b.name}</span>
            </button>
          )
        })}
      </div>
    </Screen>
  )
}
