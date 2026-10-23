# Tasteit — Worldwide collection and review standards

## Goal

Collect up to **30 actually sourced, independently reviewed recipes** for each *relevant* country × category combination. Fewer is an honest gap; do not invent names, recipes, photos, rankings or origins. Country/category classifications from any API are labels, not validated cultural ownership.

## Baseline — 23 October 2026

The official TheMealDB V1 first-letter scan returned **790 unique sourced recipe records**. The provider listed **195 countries and 14 categories**, creating **2,730 possible combinations**. Only **334 combinations** had any source records, and **0 combinations reached 30**. No recipe has yet been editorially certified as one of the world's best.

## Collection process

1. Use documented provider APIs only. Fetch the original recipe, original publisher URL, ingredient list and attribution where available.
2. Deduplicate by source ID, name variants and equivalent dishes. Countries sharing an ambiguous regional label must not be assigned without explicit evidence.
3. Choose at most 30 candidates per provider country/category on documentation completeness alone. This is **not a popularity ranking**.
4. Commit only source metadata and URLs to the feature branch: ID, title, source, category, country label and remote image credit. Fetch full recipe instructions from source on opening.
5. Keep coverage gaps and failed scans visible. Do not label sparse, unreviewed categories complete.
6. Export the gap report and review queue so additional sources can be evaluated systematically.
7. Require a second, **human editorial review** before a recipe is described as authentic, traditional, popular or among the best.

## Editorial checks before approving a recipe

- Regional origin backed by reliable culinary references, including acknowledgement of shared dishes and variants
- Clear steps, ingredient amounts, substitutions disclosed and basic practical testability
- Publisher and author attribution; permission to reuse text checked
- Photograph owner, attribution and license documented for **each file**
- Distinct representative dishes rather than padding a country with trivial duplicate variants
- Never infer allergen-free, halal, vegetarian, nutritional or food-safety claims solely from provider labels
- Genuine recommendation evidence, independent expert/community reference, or a clearly attributed editorial judgement

A documentation score of 100 means an API entry is comparatively complete, **not** a best-in-country rating. Candidate review status remains **not reviewed** until the human checks above are recorded.

## Second-source discovery results

A link-only Wikimedia Cookbook collector retrieved **3,799 recipe pages** from the Wikibooks Category:Recipes index on 23 October 2026. This is a research queue, not a finished country/category index. No recipe text or images were copied. Each Wikibooks link must be checked for origin, category, text attribution and image reuse before it can be promoted to an approved worldwide recipe.

Queue: data/wikibooks-research-queue.json. The app exposes an opt-in searchable link list. Entries have country=null and course=null until verified. The 30-per-country/category totals remain based on source-classified TheMealDB candidates only.

## Additional sources to research

| Source | Why useful | Gate |
|---|---|---|
| [TheMealDB V1](https://www.themealdb.com/docs_api_guide.php) | Initial structured records, remote photos and original links | Development key is for testing; review production terms, third-party content and photo permissions |
| [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Category:Recipes) | Thousands of community cookbook pages with origin and course categories | Text is under applicable CC BY-SA terms; separate images have their own licences; origin tags need editorial review |
| [Wikimedia Commons](https://commons.wikimedia.org/) | Potentially reusable food photography | Check author and each individual media licence, preserve credits |
| Unverified scraped datasets | May claim large scale | **Do not import** if copyright, provenance, or country inference is unclear |

## Publication gates

Need independent live-source and link verification, rights-checked photographs, representative country coverage, physical mobile/browser accessibility, source licensing and production API arrangements. The metadata collectors never approve recipes or deploy the application.

**Release lock: do not merge PR #1 or deploy Tasteit until the user explicitly says YES.**
