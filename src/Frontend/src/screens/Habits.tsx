import { Chip, ChipGroup, Label, PrimaryButton, Screen, StepHeader, Title } from '../components/ui'
import { GOALS, MEALS, toggle } from '../onboarding'
import type { StepProps } from './types'

export function Habits({ data, update, onNext, onBack, step, total }: StepProps) {
  return (
    <Screen
      footer={
        <PrimaryButton disabled={!data.goal || data.meals.length === 0} onClick={onNext}>
          Continue
        </PrimaryButton>
      }
    >
      <StepHeader step={step} total={total} onBack={onBack} />
      <Title sub="So the app fits how you actually eat.">A few quick questions</Title>

      <Label>What's your main goal?</Label>
      <div className="grid grid-cols-2 gap-2">
        {GOALS.map((g) => (
          <Chip key={g} selected={data.goal === g} onClick={() => update({ goal: g })}>
            {g}
          </Chip>
        ))}
      </div>

      <Label hint="Pick all">Which meals do you usually eat?</Label>
      <ChipGroup>
        {MEALS.map((m) => (
          <Chip key={m} selected={data.meals.includes(m)} onClick={() => update({ meals: toggle(data.meals, m) })}>
            {m}
          </Chip>
        ))}
      </ChipGroup>
      <p className="mt-3 text-[13px] text-muted">Each one gets its own logger on Today.</p>
    </Screen>
  )
}
