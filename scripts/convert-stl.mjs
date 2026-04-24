// STL → GLB 변환 (랜덤 샘플링 + 직접 GLB 바이너리 작성)
// Node 환경에서 GLTFExporter가 동작 안 해서 minimal GLB를 직접 씀

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  {
    input: 'public/works/day7/thailand_buddha.stl',
    output: 'public/works/day7/buddha.glb',
    targetTriangles: 120000,
    // STL 축 보정 — STL 원본의 어떤 축을 up으로 쓸지
    upAxis: 'auto', // 'x' | 'y' | 'z' | 'auto' (bounding box 제일 긴 축)
  },
  {
    input: 'public/works/day7/Iisus_statuya.stl',
    output: 'public/works/day7/jesus.glb',
    targetTriangles: 120000,
    upAxis: 'auto',
  },
];

function sampleTriangles(geo, targetTri) {
  const pos = geo.attributes.position.array;
  const totalTri = pos.length / 9;
  if (totalTri <= targetTri) return geo;

  const keepRatio = targetTri / totalTri;
  const newPos = [];
  const hasNormal = !!geo.attributes.normal;
  const nrm = hasNormal ? geo.attributes.normal.array : null;
  const newNormal = [];

  for (let i = 0; i < totalTri; i++) {
    if (Math.random() > keepRatio) continue;
    const o = i * 9;
    for (let k = 0; k < 9; k++) newPos.push(pos[o + k]);
    if (hasNormal) for (let k = 0; k < 9; k++) newNormal.push(nrm[o + k]);
  }

  const newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
  if (hasNormal && newNormal.length) {
    newGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormal, 3));
  } else {
    newGeo.computeVertexNormals();
  }
  return newGeo;
}

// ── minimal GLB writer ──
// position(Float32) + normal(Float32) 두 attr만 있는 단일 mesh
function writeGLB(positions, normals) {
  const vertCount = positions.length / 3;

  // BIN chunk: position + normal (각 4바이트 패딩 맞춰서)
  const posBytes = positions.byteLength;
  const nrmBytes = normals.byteLength;
  const binLen = posBytes + nrmBytes;
  const binPad = (4 - (binLen % 4)) % 4;
  const binChunkLen = binLen + binPad;

  // min/max 계산 (position)
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }

  const json = {
    asset: { version: '2.0', generator: 'custom-stl-convert' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        mode: 4, // TRIANGLES
      }],
    }],
    buffers: [{ byteLength: binChunkLen }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes, byteLength: nrmBytes, target: 34962 },
    ],
    accessors: [
      {
        bufferView: 0, componentType: 5126, count: vertCount,
        type: 'VEC3', min, max,
      },
      {
        bufferView: 1, componentType: 5126, count: vertCount,
        type: 'VEC3',
      },
    ],
  };

  let jsonStr = JSON.stringify(json);
  // JSON chunk도 4바이트 정렬 (스페이스로 패딩)
  const jsonPad = (4 - (jsonStr.length % 4)) % 4;
  for (let i = 0; i < jsonPad; i++) jsonStr += ' ';
  const jsonBuf = Buffer.from(jsonStr, 'utf-8');
  const jsonChunkLen = jsonBuf.byteLength;

  const totalLen = 12 + 8 + jsonChunkLen + 8 + binChunkLen;
  const out = Buffer.alloc(totalLen);
  let p = 0;
  // Header
  out.writeUInt32LE(0x46546C67, p); p += 4; // 'glTF'
  out.writeUInt32LE(2, p); p += 4;           // version
  out.writeUInt32LE(totalLen, p); p += 4;    // total length
  // JSON chunk header
  out.writeUInt32LE(jsonChunkLen, p); p += 4;
  out.writeUInt32LE(0x4E4F534A, p); p += 4;  // 'JSON'
  jsonBuf.copy(out, p); p += jsonChunkLen;
  // BIN chunk header
  out.writeUInt32LE(binChunkLen, p); p += 4;
  out.writeUInt32LE(0x004E4942, p); p += 4;  // 'BIN\0'
  // position data
  Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength).copy(out, p);
  p += posBytes;
  Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength).copy(out, p);
  p += nrmBytes;
  // padding already zero

  return out;
}

async function convertOne({ input, output, targetTriangles }) {
  const absIn = path.join(ROOT, input);
  const absOut = path.join(ROOT, output);
  console.log(`\n▶ ${input}`);
  console.log(`  reading...`);
  const buf = fs.readFileSync(absIn);
  const loader = new STLLoader();
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  let geo = loader.parse(ab);

  const triCount = geo.attributes.position.count / 3;
  console.log(`  original triangles: ${triCount.toLocaleString()}`);

  console.log(`  sampling down to ~${targetTriangles.toLocaleString()}...`);
  geo = sampleTriangles(geo, targetTriangles);
  const newTri = geo.attributes.position.count / 3;
  console.log(`  sampled: ${newTri.toLocaleString()} tri`);

  // 센터링 + 정규화 (높이 = 2, 발바닥 y=0)
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = new THREE.Vector3(); bb.getSize(size);
  const center = new THREE.Vector3(); bb.getCenter(center);
  const scale = 2 / size.y;
  geo.translate(-center.x, -bb.min.y, -center.z);
  geo.scale(scale, scale, scale);

  // 정규화 후 normal 재계산
  geo.computeVertexNormals();

  const positions = geo.attributes.position.array;
  const normals = geo.attributes.normal.array;

  // Float32Array로 강제
  const posF = positions instanceof Float32Array ? positions : new Float32Array(positions);
  const nrmF = normals instanceof Float32Array ? normals : new Float32Array(normals);

  console.log(`  writing GLB...`);
  const glb = writeGLB(posF, nrmF);
  fs.writeFileSync(absOut, glb);
  const outSize = fs.statSync(absOut).size;
  console.log(`  ✓ wrote ${output} (${(outSize / 1024 / 1024).toFixed(2)} MB)`);
}

for (const t of TARGETS) {
  try {
    await convertOne(t);
  } catch (e) {
    console.error(`✗ ${t.input} failed:`, e);
    process.exit(1);
  }
}
console.log('\n✓ all done');
