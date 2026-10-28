import { useState } from 'react'
import { Logo } from '../components/Logo'
import { PrimaryButton, Screen } from '../components/ui'
import { collegeFromEmail, type OnboardingData } from '../onboarding'

const inputClass =
  'h-13 w-full rounded-xl border border-line bg-white px-4 text-[16px] outline-none placeholder:text-[#a3a3a3] focus:border-ink focus:ring-1 focus:ring-ink'

export function SignUp({ data, update, onNext }: { data: OnboardingData; update: (p: Partial<OnboardingData>) => void; onNext: () => void }) {
  const [touched, setTouched] = useState(false)
  const college = collegeFromEmail(data.email)
  const emailError = data.email && !college ? 'Use your 5C school email.' : ''
  const passwordError = data.password && data.password.length < 8 ? 'Password needs at least 8 characters.' : ''
  const valid = !!college && data.password.length >= 8

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (!valid) return
        // Pre-pick the college from the email domain; the user can still change it next.
        update({ college: data.college ?? college })
        onNext()
      }}
    >
      <Screen
        footer={
          <>
            <PrimaryButton type="submit" disabled={touched && !valid}>
              Create account
            </PrimaryButton>
            <button type="button" className="mt-4 block w-full text-center text-[15px] font-medium text-c-blue">
              I already have an account: log in
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center pt-12 text-center">
          <Logo />
          <h1 className="mt-4 font-display text-[40px] font-extrabold tracking-tight">5C Fit</h1>
          <p className="mt-2 max-w-64 text-[16px] text-muted">Log every dining hall meal in a few taps.</p>
        </div>

        <label className="mt-10 block">
          <span className="mb-2 block text-[14px] font-semibold">School email</span>
          <input
            className={inputClass}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="you@pomona.edu"
            value={data.email}
            onChange={(e) => update({ email: e.target.value })}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-[14px] font-semibold">Password</span>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={data.password}
            onChange={(e) => update({ password: e.target.value })}
          />
        </label>
        <p className={`mt-3 text-[13px] ${touched && (emailError || passwordError) ? 'text-c-red' : 'text-muted'}`}>
          {touched && (emailError || passwordError)
            ? emailError || passwordError
            : 'Any 5C email works: Pomona, CMC, Scripps, Mudd or Pitzer.'}
        </p>
      </Screen>
    </form>
  )
}
