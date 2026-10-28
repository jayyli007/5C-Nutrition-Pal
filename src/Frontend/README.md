# 5C Fit frontend

Phone-first web app for 5C Fit, built with Vite, React, TypeScript and Tailwind CSS v4.

```sh
cd src/Frontend
npm install
npm run dev       # http://localhost:5173 (open it in your phone browser with `npm run dev -- --host`)
npm run build
```

## Onboarding flow

`src/App.tsx` walks through these screens in order. Answers live in one `OnboardingData` object (`src/onboarding.ts`), which is also where the option lists (colleges, allergens, nutrients…) are defined.

1. **Sign up** (`SignUp.tsx`): 5C school email + password. The college is guessed from the email domain.
2. **Name + college** (`NameCollege.tsx`)
3. **Background gradient** (`Background.tsx`)
4. **Goal + meals** (`Habits.tsx`)
5. **Dietary restrictions + allergens** (`DietAllergens.tsx`)
6. **What do you want to track?** (`Tracking.tsx`): calories, protein, carbs, fats, fiber, sugar, sodium, saturated fat, cholesterol.

Nothing is sent to a backend yet; the last screen shows a summary of the answers.
