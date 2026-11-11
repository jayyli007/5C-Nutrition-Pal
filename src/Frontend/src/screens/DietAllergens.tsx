import { Chip, ChipGroup, Label, PrimaryButton, Screen, StepHeader, Title } from '../components/ui'
import { ALLERGENS, DIETARY_RESTRICTIONS, toggle } from '../onboarding'
import type { StepProps } from './types'

export function DietAllergens({ data, update, onNext, onBack, step, total }: StepProps) {
  const nothingPicked = data.allergens.length === 0 && data.dietary.length === 0 && !data.otherAllergens.trim()
  return (
    <Screen
      footer={
        <>
          {nothingPicked && (
            <button type="button" onClick={onNext} className="mb-3 block w-full text-center text-[15px] font-medium text-c-blue">
              No allergies or restrictions
            </button>
          )}
          <PrimaryButton onClick={onNext}>Start logging</PrimaryButton>
        </>
      }
    >
      <StepHeader step={step} total={total} onBack={onBack} />
      <Title sub="We'll flag dining hall dishes that don't fit.">Anything we should watch for?</Title>

      <Label hint="Pick all" sub="Dishes with these get a red warning.">
        Allergies
      </Label>
      <ChipGroup>
        {ALLERGENS.map((a) => (
          <Chip key={a} tone="danger" selected={data.allergens.includes(a)} onClick={() => update({ allergens: toggle(data.allergens, a) })}>
            {a}
          </Chip>
        ))}
      </ChipGroup>
      <input
        className="mt-3 h-12 w-full rounded-xl border border-line bg-white px-4 text-[16px] outline-none placeholder:text-[#a3a3a3] focus:border-ink"
        placeholder="Something else? e.g. mustard, corn"
        value={data.otherAllergens}
        onChange={(e) => update({ otherAllergens: e.target.value })}
      />

      <Label hint="Pick all" sub="We'll show matching dishes first.">
        Dietary preferences
      </Label>
      <ChipGroup>
        {DIETARY_RESTRICTIONS.map((d) => (
          <Chip key={d} selected={data.dietary.includes(d)} onClick={() => update({ dietary: toggle(data.dietary, d) })}>
            {d}
          </Chip>
        ))}
      </ChipGroup>

      <div className="mt-5 flex gap-2.5 rounded-xl bg-white p-3.5 text-[13px] text-muted">
        <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5.5M12 7.8v.2" />
        </svg>
        Menus and recipes change. For a serious allergy, always confirm with dining hall staff.
      </div>
    </Screen>
  )
}
