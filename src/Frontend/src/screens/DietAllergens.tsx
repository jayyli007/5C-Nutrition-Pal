import { Chip, ChipGroup, Label, PrimaryButton, Screen, StepHeader, Title } from '../components/ui'
import { ALLERGENS, DIETARY_RESTRICTIONS, toggle } from '../onboarding'
import type { StepProps } from './types'

export function DietAllergens({ data, update, onNext, onBack, step, total }: StepProps) {
  const noDiet = data.dietary.length === 0
  const noAllergens = data.allergens.length === 0 && !data.otherAllergens.trim()
  return (
    <Screen footer={<PrimaryButton onClick={onNext}>Continue</PrimaryButton>}>
      <StepHeader step={step} total={total} onBack={onBack} />
      <Title sub="We'll flag menu items that don't work for you.">Anything you avoid?</Title>

      <Label hint="Pick all">Dietary restrictions</Label>
      <ChipGroup>
        <Chip selected={noDiet} onClick={() => update({ dietary: [] })}>
          None
        </Chip>
        {DIETARY_RESTRICTIONS.map((d) => (
          <Chip key={d} selected={data.dietary.includes(d)} onClick={() => update({ dietary: toggle(data.dietary, d) })}>
            {d}
          </Chip>
        ))}
      </ChipGroup>

      <Label hint="Pick all">Allergens</Label>
      <ChipGroup>
        <Chip selected={noAllergens} onClick={() => update({ allergens: [], otherAllergens: '' })}>
          None
        </Chip>
        {ALLERGENS.map((a) => (
          <Chip key={a} selected={data.allergens.includes(a)} onClick={() => update({ allergens: toggle(data.allergens, a) })}>
            {a}
          </Chip>
        ))}
      </ChipGroup>
      <input
        className="mt-3 h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] outline-none placeholder:text-[#a3a3a3] focus:border-ink"
        placeholder="Something else? e.g. mustard, corn"
        value={data.otherAllergens}
        onChange={(e) => update({ otherAllergens: e.target.value })}
      />
      <p className="mt-3 text-[13px] text-muted">
        Menu allergen labels can be incomplete. Always check with dining hall staff if you have a severe allergy.
      </p>
    </Screen>
  )
}
