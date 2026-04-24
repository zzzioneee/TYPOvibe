// GLB bounding box 확인용
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const files = ['public/works/day7/buddha.glb', 'public/works/day7/jesus.glb'];

for (const f of files) {
  const buf = fs.readFileSync(path.join(ROOT, f));
  // GLB parse: JSON chunk 찾기
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const version = dv.getUint32(4, true);
  const jsonLen = dv.getUint32(12, true);
  const jsonStart = 20;
  const jsonStr = buf.slice(jsonStart, jsonStart + jsonLen).toString('utf-8');
  const json = JSON.parse(jsonStr);
  // POSITION accessor의 min/max
  const posAcc = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
  console.log(f);
  console.log('  position min:', posAcc.min);
  console.log('  position max:', posAcc.max);
  const size = posAcc.max.map((v, i) => v - posAcc.min[i]);
  console.log('  size (x,y,z):', size.map(n => n.toFixed(3)));
  // 가장 긴 축 = 실제로 세로
  const longest = size.indexOf(Math.max(...size));
  const axisName = ['x', 'y', 'z'][longest];
  console.log('  tallest axis:', axisName);
}
