# Tasteit 🍽️

**A personal recipe universe** — explore cooking traditions, save dishes you want to try, keep track of what's in your kitchen, and plan meals using what you have.

> **Status:** GitHub-only development prototype. Nothing has been deployed. This first release uses TheMealDB's developer/test API and saves personal data locally in the browser.

## Run it

Use any local HTTP server, for example:

~~~bash
python3 -m http.server 4173
# open http://localhost:4173
~~~

Modern browsers require serving the JavaScript modules over HTTP; opening index.html using file:// may not work.

No npm install is needed. Node 20+ runs automated tests:

~~~bash
npm run verify
~~~

GitHub Actions also runs a separate **Playwright headless browser smoke test** (against fixture-backed API responses) covering discovery, saving, personal recipes, a cooking journal, separately dated pantry batches, use-soon recommendations, user-confirmed serving-size scaling, portion-aware meal planning, backup/restore and narrow mobile layout. Browser fixtures test UI reliability, not live API uptime or image licensing.

## First-release capabilities

- Search recipes by name, explore source-provided cuisines **and meal categories** (such as Seafood or Dessert), and see ingredients, steps, photography attribution, original publisher/video links where supplied. Categories are not verified dietary or allergen certifications. The initial feed mixes several starting letters rather than only one alphabetical slice.
- Save **Want to try**, **Usual dishes**, and **Favourites** independently; record cooking ratings/notes, add and edit personal recipes, and organise anything in named labels such as Weeknight or Family.
- Search and sort your private cookbook by name, cuisine, last cooked, most cooked or your own labels. Labels and cooking notes persist in JSON backups.
- Add ingredients to your personal pantry with amount, unit, storage location and an optional recorded best-before date. Use ＋ beside any ingredient to record a **separate purchase batch** without overwriting the old one; edit and remove individual batches. **Bulk add** accepts names separated by commas or one per line, with optional `Ingredient | amount unit | location | date` rows. Preview and explicit confirmation precede writes; bulk duplicate items are skipped rather than overwriting stock. To record a second physical batch, use the individual ＋ action.
- Find recipe candidates from up to four pantry ingredients. Match ingredient names (including a small vetted set of regional synonyms such as aubergine/eggplant and garbanzo/chickpea) and report **missing**, **insufficient** or **uncertain** amounts when units permit a conservative comparison.
- Highlight ingredients with dates within the next three days, and prioritise matching recipes that use them. Recorded best-before dates are not an automatic safety verdict.
- Set the original serving count yourself (never assumed), adjust serving sizes in a recipe, and plan a different portion count on each day. Compatible ingredient quantities scale conservatively, with warnings for unsupported amounts and fractional whole items.
- Plan the next seven days and generate a shopping list that totals compatible, portion-adjusted amounts across days, subtracts measured pantry stock, and flags vague or incompatible quantities for checking. Existing meal plans and older backups still load.
- Local persistence via localStorage, JSON backup export/import, accessible controls, loading/empty/error states and responsive navigation.

## Limits (intentional)

- The developer key \`1\` is for testing/education/personal projects. **Before any public launch** secure a production arrangement with TheMealDB and review its image/content terms. Never claim user-submitted source photography as original Tasteit work.
- TheMealDB is not every recipe in the world. The provider's cuisine/category tags, photographs and instructions are community-provided and are **not independently verified as authentic, vegetarian, allergen-free or safe**. The recipe detail panel explains provenance and links to the original source/video when available.
- Browser-local storage is device-specific and can be cleared. There is **no account, cloud sync, automatic backup, or offline recipe guarantee** yet. Manual JSON backups are available under My recipes.
- TheMealDB v1 allows single-ingredient filtering. The app aggregates a small set of queries to propose candidates and checks ingredients client-side. Pantry entries dated in the past or with zero quantity are excluded from automatic matching as a cautious default, not as a determination that food has spoiled. The quantity engine compares only unambiguous amounts (including g/kg and ml/l), never guesses densities or converts cups to grams, and flags uncertain measurements. Changing serving sizes requires a user-confirmed original count because the recipe provider does not supply a dependable baseline. Spice amounts, fractional whole items and cooking instructions are not automatically adjusted; displayed scaled amounts may be rounded. Substitutions, dietary/allergen safety and actual food freshness are **not** verified.
- Recipe content and pictures require network access. Do not deploy this developer prototype publicly without reviewing API and image licensing.

## Product roadmap

1. **Foundation** — diverse discovery, recipe details, personal recipes, local collections, backups and browser acceptance (this PR).
2. **Personalisation** — cooking history/notes, custom recipes, saved labels, collection search and sorting added; scheduled reminders and personal photo uploads remain.
3. **Kitchen intelligence** — amount comparisons, vetted name aliases, separately dated stock batches and use-soon suggestions are available; user-confirmed serving scaling added; ingredient-specific equivalence, stock forecasting and calendar/notification controls remain.
4. **Trustworthy world coverage** — licensed expanded sources, multiple genuine regional variants, editorial provenance and image rights.
5. **Accounts and synchronisation** — optional private backend, migration from local data, privacy and security acceptance.
6. **Advanced conveniences** — optional barcode/photo capture with mandatory user confirmation, multilingual UI and guided cooking.

Recipe source and photography attribution: [TheMealDB](https://www.themealdb.com/). [Official API guide](https://www.themealdb.com/docs_api_guide.php) · [Terms of use](https://www.themealdb.com/terms_of_use.php).

Tasteit source code is an original prototype; third-party recipes and photographs retain their respective rights.
