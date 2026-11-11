import { useEffect, useState } from 'react'
import type { Tab } from './components/app'
import { initialData, type Meal, type OnboardingData } from './onboarding'
import { Background } from './screens/Background'
import { DietAllergens } from './screens/DietAllergens'
import { HallMenu } from './screens/HallMenu'
import { LogStart } from './screens/LogStart'
import { Me } from './screens/Me'
import { NameCollege } from './screens/NameCollege'
import { OwnFood } from './screens/OwnFood'
import { SignUp } from './screens/SignUp'
import { Stats } from './screens/Stats'
import { Today } from './screens/Today'
import { Tracking } from './screens/Tracking'
import { seedDemo } from './demo'
import { mealForNow, useAppState, withoutPassword, type LogEntry, type MyFood, type Profile } from './store'

// Steps after sign-up, in order; the progress bar counts these.
const STEPS = [NameCollege, Background, Tracking, DietAllergens]

type Route =
  | { name: 'signup' }
  | { name: 'onboarding'; step: number }
  | { name: Tab }
  | { name: 'log'; meal: Meal }
  | { name: 'hall'; meal: Meal }
  | { name: 'own'; meal: Meal }

export default function App() {
  const [state, setState] = useAppState()
  const [route, setRoute] = useState<Route>(() => (state.signedIn ? { name: 'today' } : { name: 'signup' }))
  // Onboarding answers live here until the last step, so the password never reaches storage.
  const [draft, setDraft] = useState<OnboardingData>(() => ({ ...initialData, ...state.profile, password: '' }))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  // Visit /?demo to fill two weeks of sample meals, handy for previewing Today and Stats.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('demo')) return
    setState((s) => seedDemo(s))
    setRoute({ name: 'today' })
    window.history.replaceState(null, '', window.location.pathname)
  }, [setState])

  const go = (r: Route) => setRoute(r)
  const updateProfile = (patch: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
  const addLogs = (entries: LogEntry[]) => setState((s) => ({ ...s, logs: [...s.logs, ...entries] }))
  const saveFood = (food: MyFood) => setState((s) => ({ ...s, myFoods: [food, ...s.myFoods.filter((f) => f.name.toLowerCase() !== food.name.toLowerCase())] }))
  const removeLog = (id: string) => setState((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) }))
  const onTab = (t: Tab) => go({ name: t })

  switch (route.name) {
    case 'signup':
      return (
        <SignUp
          data={draft}
          update={(p) => setDraft((d) => ({ ...d, ...p }))}
          onNext={() => go({ name: 'onboarding', step: 1 })}
          onLogIn={() => {
            setState((s) => ({ ...s, signedIn: true }))
            go({ name: 'today' })
          }}
        />
      )
    case 'onboarding': {
      const Step = STEPS[route.step - 1]
      return (
        <Step
          data={draft}
          update={(p) => setDraft((d) => ({ ...d, ...p }))}
          onBack={() => go(route.step === 1 ? { name: 'signup' } : { name: 'onboarding', step: route.step - 1 })}
          onNext={() => {
            if (route.step < STEPS.length) return go({ name: 'onboarding', step: route.step + 1 })
            setState((s) => ({ ...s, profile: withoutPassword(draft), signedIn: true }))
            go({ name: 'today' })
          }}
          step={route.step}
          total={STEPS.length}
        />
      )
    }
    case 'today':
      return <Today state={state} onTab={onTab} onLog={(meal) => go({ name: 'log', meal: meal ?? mealForNow() })} addLogs={addLogs} removeLog={removeLog} />
    case 'stats':
      return <Stats state={state} onTab={onTab} />
    case 'me':
      return (
        <Me
          state={state}
          onTab={onTab}
          update={updateProfile}
          onLogOut={() => {
            setState((s) => ({ ...s, signedIn: false }))
            setDraft({ ...initialData, ...state.profile, password: '' })
            go({ name: 'signup' })
          }}
        />
      )
    case 'log':
      return (
        <LogStart
          background={state.profile.background}
          meal={route.meal}
          onMeal={(meal) => go({ name: 'log', meal })}
          onHall={() => go({ name: 'hall', meal: route.meal })}
          onOther={() => go({ name: 'own', meal: route.meal })}
          onCancel={() => go({ name: 'today' })}
        />
      )
    case 'hall':
      return (
        <HallMenu
          profile={state.profile}
          meal={route.meal}
          onBack={() => go({ name: 'log', meal: route.meal })}
          onSave={(entries) => {
            addLogs(entries)
            go({ name: 'today' })
          }}
        />
      )
    case 'own':
      return (
        <OwnFood
          background={state.profile.background}
          meal={route.meal}
          myFoods={state.myFoods}
          onBack={() => go({ name: 'log', meal: route.meal })}
          onSave={(entry, food) => {
            addLogs([entry])
            if (food) saveFood(food)
            go({ name: 'today' })
          }}
        />
      )
  }
}
