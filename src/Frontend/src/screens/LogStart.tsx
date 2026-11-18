import type { ReactNode } from 'react'
import { BackTitle, Page, Segmented, SectionLabel } from '../components/app'
import { PrimaryButton } from '../components/ui'
import { MEALS, type BackgroundId, type Meal } from '../onboarding'

export function LogStart({
  background,
  meal,
  onMeal,
  onHall,
  onOther,
  onCancel,
}: {
  background: BackgroundId
  meal: Meal
  onMeal: (m: Meal) => void
  onHall: () => void
  onOther: () => void
  onCancel: () => void
}) {
  return (
    <Page background={background} footer={<PrimaryButton onClick={onCancel}>Cancel</PrimaryButton>}>
      <BackTitle onBack={onCancel}>Log {meal.toLowerCase()}</BackTitle>

      <SectionLabel>Which meal?</SectionLabel>
      <Segmented label="Meal" options={MEALS} value={meal} onChange={onMeal} />

      <h2 className="mt-7 font-display text-[22px] font-extrabold tracking-tight">Where's it from?</h2>
      <div className="mt-3 space-y-3">
        <Choice
          onClick={onHall}
          color="bg-c-green"
          title="Dining hall"
          body="Frary, Frank, Collins and more. Pick from today's menu; nutrition is filled in for you."
          icon={<path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5h4v5" />}
        />
        <Choice
          onClick={onOther}
          color="bg-c-orange"
          title="Other"
          body="Off campus, a snack, the Coop: type in what you ate and its nutrition yourself."
          icon={<path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1ZM14.5 6.5l3 3" />}
        />
      </div>
    </Page>
  )
}

function Choice({ onClick, color, title, body, icon }: { onClick: () => void; color: string; title: string; body: string; icon: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]">
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl text-white ${color}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icon}
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{body}</span>
      </span>
      <svg className="shrink-0 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  )
}
