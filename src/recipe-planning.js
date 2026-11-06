import {nextSevenDates,exportBackup,parseBackup} from './model.js';
import {planKey} from './meal-plan.js';
export function planRecipe(store,meal,day,slot='dinner') {
 if(!nextSevenDates().some(d=>d.key===day)||!meal?.idMeal)throw Error('Choose a day in the coming week.');
 const key=planKey(day,slot);
 const saved={...store.saved,[meal.idMeal]:{...store.saved[meal.idMeal],meal}},plan={...store.plan,[key]:meal.idMeal},planServings={...store.planServings};
 if(store.plan[key]!==meal.idMeal)delete planServings[key];
 const next={...store,saved,plan,planServings};parseBackup(exportBackup(next));return next;
}
