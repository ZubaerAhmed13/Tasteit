import importlib.util, pathlib, unittest
p=pathlib.Path('scripts/collect-complete-recipes.py'); spec=importlib.util.spec_from_file_location('collector',p); module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
class Extraction(unittest.TestCase):
 def test_complete_sections_keep_quantities_logical_steps_and_notes(self):
  html='<table><tr><td>Navigation</td></tr></table><h2>Ingredients<span class="mw-editsection">edit</span></h2><ul><li>1<sup>½</sup> cups flour</li><li>1 egg</li></ul><h2>Equipment</h2><ul><li>Pan</li></ul><h2>Procedure</h2><ol><li>Mix ingredients. Keep lumps.</li><li>Cook.<ul><li>Turn once.</li></ul></li></ol><h2>Notes, tips and variations</h2><ul><li>Use a hot pan.</li></ul><h2>References</h2><ul><li>Not recipe text</li></ul>'
  ingredients,steps,notes=module.extract_sections(html)
  self.assertEqual(ingredients,['1½ cups flour','1 egg']);self.assertEqual(steps,['Mix ingredients. Keep lumps.','Cook. Turn once.']);self.assertEqual(notes,['Use a hot pan.'])
 def test_multi_method_sections_fail_and_intro_directions_are_kept(self):
  base='<h2>Ingredients</h2><ul><li>1 egg</li></ul><h2>Method</h2>'
  self.assertEqual(module.extract_sections(base+'<p>Preheat the oven.</p><ol><li>Mix and cook.</li></ol>')[1],['Preheat the oven.','Mix and cook.'])
  with self.assertRaises(ValueError):module.extract_sections(base+'<h3>Pan version</h3><ol><li>Fry.</li></ol><h3>Oven version</h3><ol><li>Bake.</li></ol>')
 def test_full_page_navigation_and_footer_never_become_cooking_steps(self):
  html='<html><body><div class="mw-parser-output"><h2>Ingredients</h2><ul><li>1 egg</li></ul><h2>Method</h2><ol><li>Cook the egg.</li></ol></div><ul><li>Privacy policy</li><li>View history</li></ul></body></html>'
  self.assertEqual(module.extract_sections(html)[1],['Cook the egg.'])
 def test_primary_amount_keeps_source_quantity_and_optional_notes(self):
  self.assertEqual(module.primary_amount('3 cups (720 g) quick oats'),'3 cups quick oats')
  self.assertEqual(module.primary_amount('280 g (1¼ cup / 10 oz) flour'),'280 g flour')
  self.assertEqual(module.primary_amount('2 tbsp milk (optional)'),'2 tbsp milk (optional)')
 def test_preparation_sizes_are_not_mistaken_for_unit_conversions(self):
  for line in ['½ cup nuts (for example, ½-inch walnut pieces)', '1 onion (cut into 2 cm pieces)', '1 carrot (sliced ¼ inch thick)']:
   self.assertEqual(module.primary_amount(line),line)
 def test_package_weights_and_required_water_amounts_are_primary(self):
  for line in ['1 package (8 oz/230 g) sliced mushrooms', 'Warm water as required (about 1 ½ cups)', '1 halibut fillet (approximately 1 pound / 450 g)']:
   self.assertEqual(module.primary_amount(line),line)
 def test_oxford_comma_notes_are_preserved(self):
  html='<h2>Ingredients</h2><ul><li>1 egg</li></ul><h2>Procedure</h2><ol><li>Cook.</li></ol><h2>Notes, tips, and variations</h2><ul><li>Important preparation note.</li></ul>'
  self.assertEqual(module.extract_sections(html)[2],['Important preparation note.'])
 def test_missing_ambiguous_or_script_only_methods_are_rejected(self):
  for html in ['<h2>Ingredients</h2><ul><li>1 egg</li></ul>','<h2>Ingredients</h2><ul><li>1 egg</li></ul><h2>Method</h2><script>Invent cooking directions</script>','<h2>Ingredients</h2><ul><li>1 egg</li></ul><h2>Method</h2><ol><li>Cook</li></ol><h2>Procedure</h2><ol><li>Other method</li></ol>']:
   with self.assertRaises(ValueError):module.extract_sections(html)
if __name__=='__main__':unittest.main()
