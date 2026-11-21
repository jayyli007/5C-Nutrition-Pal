# 5C Fit frontend

Phone-first web app for 5C Fit, built with Vite, React, TypeScript and Tailwind CSS v4.

```sh
cd src/Frontend
npm install
npm run dev       # http://localhost:5173 (open it in your phone browser with `npm run dev -- --host`)
npm run build
```

## Menus (Supabase)

Menus come from the `all_menu_items` table in Supabase, which `scraper/menu_database.py` fills every morning (see `.github/workflows/scrape-menus.yml`). The app reads it with the public anon key; row level security only allows reads.

Set these in Vercel (Project → Settings → Environment Variables, for Production and Preview) and, for local dev, in `src/Frontend/.env.local` (copy `.env.example`):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

Use the **anon / public** key only. Never the `service_role` key: every `VITE_` variable is bundled into the site and visible to anyone. Vite reads these at build time, so redeploy after changing them.

Without them the app runs on sample menus (`sampleMenu` in `src/menu.ts`) and the menu screen says so.

Deploying on Vercel: Root Directory `src/Frontend`, framework Vite (build `npm run build`, output `dist`). No `vercel.json` is needed.

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

Logs, My Foods and settings are saved in `localStorage` (`src/store.ts`); the password is never stored.

`src/menu.ts` fetches menus (`getMenu` for one hall and meal, `getMealAllHalls` for the Tonight pick), caches them per day, and maps UI names (`Frary`, `Dinner`) to the lowercase values in the table. Allergen and diet flags can be null when a hall doesn't report them (McConnell lists no allergens): the menu then says the allergen isn't listed, and the Tonight pick skips the dish. Oldenborg has no scraper yet, and saturated fat isn't scraped, so neither shows menu data.

Bon Appétit halls (Collins, Malott, McConnell) list every component, so a meal can have 250+ rows. Their `tier` column ranks them: 1 "Specials" (main dishes), 2 "Additional Favorites", 3 "Condiments and Extras". The menu shows main dishes first and folds the rest of each station under "N more items" (search shows everything); stations with no main dish, like the salad bar, sink to the bottom. Other halls have no tier, so all their items count as main dishes. Collins' "continental breakfast" shows under Breakfast.

Open `/?demo` to fill three weeks of meals from the sample menus for previewing Today and Stats (this replaces saved logs).

The logo lives in `public/` as `logo.svg` (used on sign-up and as the favicon) and `logo.png`, plus `apple-touch-icon.png`, `icon-*.png` and `manifest.webmanifest` for adding the app to a phone home screen.
