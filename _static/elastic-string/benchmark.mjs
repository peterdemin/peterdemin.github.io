// Offline physics benchmark: no frame budget, drawing, or browser required.
// Optionally pass another physics.mjs path to compare implementations.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {ElasticString}=await import(process.argv[2]
  ?pathToFileURL(resolve(process.argv[2])).href:new URL('./physics.mjs',import.meta.url).href);
function run(speed,ticks) {
  const string=new ElasticString();string.release();
  for(let i=1;i<=string.p.segments;i++)string.state[string.p.size+2*i+1]=-speed*i/string.p.segments;
  let attempts=0;
  const substep=string.substep.bind(string);
  string.substep=h=>{attempts++;substep(h);};
  const start=performance.now();
  for(let i=0;i<ticks;i++)string.step();
  return {milliseconds:performance.now()-start,attempts,simulatedSeconds:string.time};
}
run(6,300); // Warm up the solver before timing.
for(const speed of [0,6,18]) {
  const runs=Array.from({length:5},()=>run(speed,1000));
  runs.sort((a,b)=>a.milliseconds-b.milliseconds);
  console.log(JSON.stringify({initialTipSpeed:speed,...runs[2]}));
}
