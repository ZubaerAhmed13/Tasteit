# Tasteit — Worldwide collection and review standards

## Goal

Collect up to **30 actually sourced, independently reviewed recipes** for each *relevant* country × category combination. Fewer is an honest gap; do not invent names, recipes, photos, rankings or origins. Country/category classifications from any API are labels, not validated cultural ownership.

## Baseline — 23 October 2026

The official TheMealDB V1 first-letter scan returned **790 unique sourced recipe records**. The provider listed **195 countries and 14 categories**, creating **2,730 possible combinations**. Only **334 combinations** had any source records, and **0 combinations reached 30**. No recipe has yet been editorially certified as one of the world's best.

## Collection process

1. For the historical provider catalogue, use documented provider APIs. For the selected-source collection, use original Recipe JSON-LD from only the user-selected publishers. Fetch the original recipe, original publisher URL, ingredient list and attribution where available.
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

## Separate text and photograph reuse research

The reviewer may request **on-demand** source file titles from Wikibooks (`prop=images`, limited to 12 per page) and inspect one candidate file's metadata from Wikimedia Commons (`prop=imageinfo` with selected metadata fields). It shows source file-page links and untrusted author/licence strings as escaped text, **not** rendered HTML; there is no photo download, automatic licence approval or automatic form prefill. Wikimedia's own metadata guide warns that machine metadata can be incomplete, so manual file-page and licence checks remain mandatory.


Wikibooks' [official copyright policy](https://en.wikibooks.org/wiki/Wikibooks:Copyrights) explains contributor text rights and attribution/share-alike requirements. The [MediaWiki Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo) exposes file-level properties; [Wikimedia Commons metadata guidance](https://commons.wikimedia.org/wiki/Commons:Machine-readable_data) makes clear that copyright data can be incomplete or free text. **Never assume the same licence covers a recipe's words and photograph.**

Each Tasteit review may record **text handling** (link-only, or proposed text reuse requiring a licence evidence URL and attribution wording) and **photo handling** (none, original link only, or proposed photo reuse requiring original file-description URL, specific photo licence URL, creator, and attribution). These are evidence capture fields. No option grants permission, changes recipe rankings, or publishes/rehosts third-party text/images. Independent licence verification, attribution obligations, modification/share-alike conditions and appropriate platform review remain separate release gates.

A private, manual research panel stores investigation status, proposed country/course classification, supporting external HTTPS evidence and written notes in browser storage. The research-priority filter matches **entire original category labels** (for example, a tag explicitly saying `Indian recipes`) against chosen country/area terminology and course labels, while suppressing regional aliases shared by multiple countries. Such labels are third-party metadata and **not independent evidence** of culinary origin, dish authenticity, legality of photo reuse, ingredient safety or popularity; all matched recipes remain unreviewed until a human verifies them. Shortlisting requires all fields and at least 20 characters of notes; it is still **not** editorial approval and has no effect on ranked or verified recipe counts. Local notes are included in the Tasteit JSON backup and can be exported as CSV. No user research is pushed to GitHub automatically.

Queue: data/wikibooks-research-queue.json. Original article category labels for 3,799 pages were collected on 23 October 2026 in 127 Wikimedia API batches with zero failed requests; saved to data/wikibooks-category-evidence.json. The app exposes an opt-in, paginated searchable link list and source-category hints. Entries have country=null and course=null until editorially verified. No label is automatically treated as origin proof. The 30-per-country/category totals remain based on source-classified TheMealDB candidates only.

## Additional sources to research

| Source | Why useful | Gate |
|---|---|---|
| [TheMealDB V1](https://www.themealdb.com/docs_api_guide.php) | Initial structured records, remote photos and original links | Development key is for testing; review production terms, third-party content and photo permissions |
| [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Category:Recipes) | Thousands of community cookbook pages with origin and course categories | Text is under applicable CC BY-SA terms; separate images have their own licences; origin tags need editorial review |
| [Wikimedia Commons](https://commons.wikimedia.org/) | Potentially reusable food photography | Check author and each individual media licence, preserve credits |
| Unverified scraped datasets | May claim large scale | **Do not import** if copyright, provenance, or country inference is unclear |

## Cross-source duplicate research

Compare source recipe titles conservatively: first normalise Unicode, case and punctuation; optionally match the same three or more words in different order. Keep significant food words such as `chicken`, `vegetable` and `lamb` to avoid equating different dishes. A name match is only a **possible overlap**; the reviewer must compare original recipes, techniques, country attribution and significant variants before deduplicating any records. The source inventory stays intact while unverified.

The saved [CSV](../data/source-overlap-review.csv) and [JSON](../data/source-overlap-review.json) are linked-source research artifacts with 38 potential leads as of the 23 October 2026 scan. They do not copy recipe instructions or images and cannot establish copyright permissions or recipe authenticity.

## Publication gates

Need independent live-source and link verification, rights-checked photographs, representative country coverage, physical mobile/browser accessibility, source licensing and production API arrangements. The metadata collectors never approve recipes or deploy the application.

**Release lock: do not merge PR #1 until the user explicitly approves merging. Owner-private preview updates are authorised in this conversation; public release remains separate.**

## Selected-source collection — 24 October 2026

The new collector restricts recipe URLs, redirects and canonical publishers to the 16 websites in the user’s shared list. It stores factual metadata and ingredient amounts, not recipe methods or user reviews. Ratings belong to the main recipe and retain scale, vote/review count and checked time. Missing ratings and blocked sources remain visible. Ingredient reference photographs have a separate Wikimedia Commons provenance registry, visual identity review, creator and licence evidence; unmatched or ambiguous forms are not illustrated by guesswork. Existing historical source records are not reclassified as members of this collection.
