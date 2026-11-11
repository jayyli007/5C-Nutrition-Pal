import type { OnboardingData } from '../onboarding'

export interface StepProps {
  data: OnboardingData
  update: (patch: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
  step: number
  total: number
}
