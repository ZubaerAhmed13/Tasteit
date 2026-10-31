# 100 world favourites

Add exactly 100 new, distinct recipe records to the existing 36, using only the user's 16 approved publishers. Keep all old records/IDs and personal kitchen data. The selection is Tasteit's editorial curation of regional classics, not a claim of an objective worldwide ranking.

All 100 additions need an original publisher Recipe record, a published rating at least 4/5 on its original scale, a positive published rating/review count, factual ingredient list, original recipe photograph URL and checked date. Small voting samples remain visible. Prioritise regional and dish-type breadth over duplicate versions of a dish. Original instructions and reviews stay at their publishers. Respect source access restrictions and robots rules; replace unavailable candidates with permitted originals.

Implementation choices: extend the existing selected-source collection with a named “100 world favourites” selector and a direct query link; keep “All collected recipes” as the default. Store its 100 IDs and selection criteria in a separate data registry so source refreshes preserve membership. Existing source/query/rating/sort filters compose with collection selection. Invalid/unavailable curation data disables that view without breaking the ordinary collection.

Continue real ingredient references from the existing reviewed registry; audit matches against all new ingredient facts and keep uncertain forms explicit. No generated photos, invented ratings, cross-source numerical world ranking, paywall/robots bypass or cultural authenticity certification. Preserve owner-only publication and leave PR #1 draft/unmerged.
