# 5C Fit frontend

Phone-first web app for 5C Fit, built with Vite, React, TypeScript and Tailwind CSS v4.

```sh
cd src/Frontend
npm install
npm run dev       # http://localhost:5173 (open it in your phone browser with `npm run dev -- --host`)
npm run build
```

## Onboarding flow

`src/App.tsx` routes between every screen. Onboarding answers live in one `OnboardingData` object (`src/onboarding.ts`), which is also where the option lists (colleges, halls, allergens, nutrients and their default goals) are defined.

1. **Sign up** (`SignUp.tsx`): any email + password. "I already have an account: log in" skips onboarding and opens Today.
2. **Name + college** (`NameCollege.tsx`): the college sets the home dining hall.
3. **Background gradient** (`Background.tsx`)
4. **What do you want to track?** (`Tracking.tsx`): calories, protein, carbs, fat, fiber, sugar, sodium, saturated fat, or "just log meals, no numbers".
5. **Allergens + dietary preferences** (`DietAllergens.tsx`), then Today.

## Main app

A tab bar (Stats, Log, Me) sits on every main screen, and screens use the gradient picked in onboarding.

- **Today** (`Today.tsx`, the Log tab): nutrient rings against daily goals, day streak, one card per usual meal, "Log a meal", and a "Tonight at [hall]" pick that avoids your allergens.
- **Log a meal**: `LogStart.tsx` (which meal, dining hall or other), `HallMenu.tsx` (today's menu by hall and station), `OwnFood.tsx` (type in your own food, with a macro check and My Foods).
- **Stats** (`Stats.tsx`): week / month / semester calories chart, streak, meals logged, average protein, macro split, where you ate.
- **Me** (`Me.tsx`): tracked nutrients and goals, allergens, diet, usual meals; Settings has name, college, background and log out.

Logs, My Foods and settings are saved in `localStorage` (`src/store.ts`); the password is never stored. Menus are mock data in `src/menu.ts`, shaped like the scraper's `menu_items_<hall>` tables (same column names and allergen flag columns), so the real database can replace `getMenu` later.

Open `/?demo` to fill three weeks of sample meals for previewing Today and Stats (this replaces saved logs).

The logo lives in `public/` as `logo.svg` (used on sign-up and as the favicon) and `logo.png`, plus `apple-touch-icon.png`, `icon-*.png` and `manifest.webmanifest` for adding the app to a phone home screen.
