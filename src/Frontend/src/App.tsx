import { useEffect, useState } from 'react'
import { Screen } from './components/ui'
import { BACKGROUNDS, TRACKABLES, initialData, type OnboardingData } from './onboarding'
import { Background } from './screens/Background'
import { DietAllergens } from './screens/DietAllergens'
import { Habits } from './screens/Habits'
import { NameCollege } from './screens/NameCollege'
import { SignUp } from './screens/SignUp'
import { Tracking } from './screens/Tracking'

// Steps after sign-up, in order; the progress bar counts these.
const STEPS = [NameCollege, Background, Habits, DietAllergens, Tracking]

export default function App() {
  const [data, setData] = useState<OnboardingData>(initialData)
  // 0 = sign up, 1..STEPS.length = onboarding steps, past that = done
  const [index, setIndex] = useState(0)
  const update = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }))
  const next = () => setIndex((i) => i + 1)
  const back = () => setIndex((i) => Math.max(0, i - 1))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index])

  if (index === 0) return <SignUp data={data} update={update} onNext={next} />

  const Step = STEPS[index - 1]
  if (Step) return <Step data={data} update={update} onNext={next} onBack={back} step={index} total={STEPS.length} />

  return <Done data={data} onRestart={() => setIndex(1)} />
}

/** Placeholder landing after onboarding until the Today screen exists. */
function Done({ data, onRestart }: { data: OnboardingData; onRestart: () => void }) {
  const bg = BACKGROUNDS.find((b) => b.id === data.background)!.css
  const tracking = TRACKABLES.filter((t) => data.tracking.includes(t.id)).map((t) => t.label)
  const avoid = [...data.dietary, ...data.allergens.map((a) => `No ${a.toLowerCase()}`), data.otherAllergens.trim()].filter(Boolean)
  return (
    <div className="min-h-dvh" style={{ background: bg }}>
      <Screen>
        <h1 className="mt-10 font-display text-[34px] leading-tight font-extrabold tracking-tight">You're all set, {data.firstName.trim()}!</h1>
        <p className="mt-2 text-[15px] text-ink/70">Here's how we'll set up 5C Fit for you.</p>
        <dl className="mt-6 space-y-3">
          {[
            ['College', data.college],
            ['Goal', data.goal],
            ['Meals', data.meals.join(', ')],
            ['Avoiding', avoid.length ? avoid.join(', ') : 'Nothing'],
            ['Tracking', tracking.join(', ')],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/85 p-4 backdrop-blur">
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-[16px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onRestart} className="mt-6 text-[15px] font-medium text-c-blue">
          Edit answers
        </button>
      </Screen>
    </div>
  )
}
