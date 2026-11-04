import { Chip, ChipGroup, Label, PrimaryButton, Screen, StepHeader, Title } from '../components/ui'
import { COLLEGES, type OnboardingData } from '../onboarding'
import type { StepProps } from './types'

export function NameCollege({ data, update, onNext, onBack, step, total }: StepProps) {
  const name = data.firstName.trim()
  const hall = COLLEGES.find((c) => c.name === data.college)?.hall
  return (
    <Screen
      footer={
        <>
          {name && hall && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-c-yellow font-display text-lg font-extrabold">
                {name[0].toUpperCase()}
              </div>
              <p className="text-[15px]">
                Nice to meet you, {name}! {hall} will show up first.
              </p>
            </div>
          )}
          <PrimaryButton disabled={!name || !data.college} onClick={onNext}>
            Continue
          </PrimaryButton>
        </>
      }
    >
      <StepHeader step={step} total={total} onBack={onBack} />
      <Title sub="This is how 5C Fit will greet you.">What should we call you?</Title>

      <label className="mt-6 block">
        <span className="mb-2 block text-[14px] font-semibold">First name</span>
        <input
          className="h-14 w-full rounded-xl border-2 border-ink bg-white px-4 text-[20px] font-semibold outline-none"
          autoComplete="given-name"
          autoCapitalize="words"
          value={data.firstName}
          onChange={(e) => update({ firstName: e.target.value })}
        />
      </label>

      <Label>Your college</Label>
      <ChipGroup>
        {COLLEGES.map((c) => (
          <Chip key={c.name} selected={data.college === c.name} onClick={() => update({ college: c.name as OnboardingData['college'] })}>
            {c.name}
          </Chip>
        ))}
      </ChipGroup>
      <p className="mt-3 text-[13px] text-muted">We'll show your home dining hall first.</p>
    </Screen>
  )
}
