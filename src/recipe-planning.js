import {nextSevenDates,exportBackup,parseBackup} from './model.js';
export function planRecipe(store,meal,day) {
 if(!nextSevenDates().some(d=>d.key===day)||!meal?.idMeal)throw Error('Choose a day in the coming week.');
 const saved={...store.saved,[meal.idMeal]:{...store.saved[meal.idMeal],meal}},plan={...store.plan,[day]:meal.idMeal},planServings={...store.planServings};
 if(store.plan[day]!==meal.idMeal)delete planServings[day];
 const next={...store,saved,plan,planServings};parseBackup(exportBackup(next));return next;
}
