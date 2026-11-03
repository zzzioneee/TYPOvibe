'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const env={document:{querySelector:()=>({innerHTML:'',classList:{toggle(){}},setAttribute(){}}),addEventListener(){}},window:{},matchMedia:()=>({matches:false}),performance:{now:()=>0},requestAnimationFrame(){}};
vm.createContext(env);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],env);
const cast=vm.runInContext('procession',env),family=k=>['woman','bob','braid'].includes(k)?'soft-profile':['man','cap','coat'].includes(k)?'hat-profile':k;
const times=[...cast.flatMap(a=>[a.start-1e-7,a.start,a.start+1e-7,a.end-1e-7,a.end,a.end+1e-7]),...Array.from({length:1800},(_,i)=>i/12)];
let max=0;
for(const t of times){const active=cast.filter(a=>t>=a.start&&t<=a.end);assert(active.length<=5,`Too many active at ${t}`);assert.equal(new Set(active.map(a=>family(a.kind))).size,active.length,`Repeated family at ${t}`);max=Math.max(max,active.length);}
const last={};for(const a of cast){if(last[a.kind]!==undefined)assert(a.start-last[a.kind]>=9);last[a.kind]=a.end;}
for(let i=0;i<1800;i++){const s=env.window.artwork.scene(i/12);assert(!/NaN|undefined|Infinity/.test(s.actors+s.masks));assert(!/opacity=/.test(s.masks));}
assert(Math.min(...cast.filter(a=>a.kind==='cat').map(a=>a.speed))>Math.max(...cast.filter(a=>a.kind!=='cat').map(a=>a.speed)));
assert(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(html));
console.log(`PASS: ${cast.length} arrivals, max ${max} active, no repeated silhouette families, >=9s re-entry cooldown, 1800 finite frames, faster cats, no shadow dissolve, self-contained HTML.`);
