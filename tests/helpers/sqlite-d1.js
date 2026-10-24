import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function sqliteD1() {
  const db=new DatabaseSync(':memory:');
  for(const name of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())
    db.exec(readFileSync('drizzle/'+name,'utf8').replaceAll('--> statement-breakpoint',''));
  return {close:()=>db.close(),prepare(sql){
    const statement=db.prepare(sql);let args=[];
    return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},
      async all(){return {success:true,results:statement.all(...args)};},
      async run(){return {success:true,meta:statement.run(...args)};}};
  }};
}
