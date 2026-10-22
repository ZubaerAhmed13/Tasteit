// Personal organisation only. Tags are written by the user, not dietary assertions.
export function normaliseTag(input) {
  return String(input ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}
export function tagsOf(entry) {
  return Array.isArray(entry?.tags) ? entry.tags.filter(x => typeof x === 'string' && normaliseTag(x).length > 0) : [];
}
export function addTag(entry, raw) {
  const name = normaliseTag(raw);
  if (name.length < 1 || name.length > 30) throw new Error('Use a tag of 1–30 characters.');
  if (/[\u0000-\u001f\u007f]/u.test(name)) throw new Error('The tag contains invalid characters.');
  const tags = tagsOf(entry);
  if (tags.some(x => x.toLocaleLowerCase() === name.toLocaleLowerCase())) return { ...entry, tags };
  if (tags.length >= 12) throw new Error('Up to 12 tags per recipe.');
  return { ...entry, tags: [...tags, name] };
}
export function removeTag(entry, raw) {
  const key = normaliseTag(raw).toLocaleLowerCase();
  return { ...entry, tags: tagsOf(entry).filter(x => x.toLocaleLowerCase() !== key) };
}
export function collectionTags(saved) {
  const map = new Map();
  for (const entry of Object.values(saved)) {
    for (const name of tagsOf(entry)) {
      const key = name.toLocaleLowerCase();
      if (!map.has(key)) map.set(key, { name, count: 0 });
      map.get(key).count += 1;
    }
  }
  return [...map.values()].sort((a,b) => a.name.localeCompare(b.name));
}
export function filterCookbook(saved, { collection = 'all', tag = '', query = '', sort = 'name' } = {}) {
  const needle = String(query).trim().toLocaleLowerCase();
  const tagNeedle = normaliseTag(tag).toLocaleLowerCase();
  const entries = Object.values(saved).filter(entry => {
    if (!entry?.meal || typeof entry.meal.strMeal !== 'string') return false;
    if (!entry.wanted && !entry.usual && !entry.favourite && !(entry.cookedCount > 0) && !tagsOf(entry).length) return false;
    if (collection === 'wanted' && !entry.wanted) return false;
    if (collection === 'usual' && !entry.usual) return false;
    if (collection === 'favourite' && !entry.favourite) return false;
    if (collection === 'cooked' && !(entry.cookedCount > 0)) return false;
    if (tagNeedle && !tagsOf(entry).some(x => x.toLocaleLowerCase() === tagNeedle)) return false;
    return !needle || [entry.meal.strMeal,entry.meal.strArea,...tagsOf(entry)]
      .filter(x => typeof x === 'string').some(x => x.toLocaleLowerCase().includes(needle));
  });
  const recency = entry => {
    const n = Date.parse(entry.lastCooked || '');
    return Number.isFinite(n) ? n : -1;
  };
  if (sort === 'recent') entries.sort((a,b) => recency(b) - recency(a) || a.meal.strMeal.localeCompare(b.meal.strMeal));
  else if (sort === 'most-cooked') entries.sort((a,b) => (b.cookedCount || 0) - (a.cookedCount || 0) || a.meal.strMeal.localeCompare(b.meal.strMeal));
  else entries.sort((a,b) => a.meal.strMeal.localeCompare(b.meal.strMeal));
  return entries;
}
