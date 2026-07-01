/**
 * Three.js Hero Background
 * 悬浮线框几何体 — 鼠标响应 — 呼吸级动画
 * 去AI感：有机运动、不规则几何、克制色彩
 */
import * as THREE from 'three';

const canvas = document.getElementById('heroCanvas');
if (!canvas) throw new Error('No hero canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 8;

// ── 主几何体：不规则二十面体线框 ──
const icoGeo = new THREE.IcosahedronGeometry(1.6, 1);
// 微扰动顶点，去几何感
const pos = icoGeo.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
  const noise = 1 + (Math.sin(x * 5) * Math.cos(y * 5) * Math.cos(z * 5)) * 0.15;
  pos.setXYZ(i, x * noise, y * noise, z * noise);
}
icoGeo.computeVertexNormals();

const icoMat = new THREE.MeshBasicMaterial({
  color: 0xe87830,
  wireframe: true,
  transparent: true,
  opacity: 0.28,
});
const ico = new THREE.Mesh(icoGeo, icoMat);
scene.add(ico);

// ── 外层粒子环 ──
const ringCount = 200;
const ringGeo = new THREE.BufferGeometry();
const ringPositions = new Float32Array(ringCount * 3);
for (let i = 0; i < ringCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const r = 2.4 + Math.random() * 0.6;
  ringPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  ringPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  ringPositions[i * 3 + 2] = r * Math.cos(phi);
}
ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
const ringMat = new THREE.PointsMaterial({
  color: 0xe87830,
  size: 0.025,
  transparent: true,
  opacity: 0.45,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const ring = new THREE.Points(ringGeo, ringMat);
scene.add(ring);

// ── 细线连接环 ──
const lineCount = 40;
const lineGeo = new THREE.BufferGeometry();
const linePts = new Float32Array(lineCount * 6);
for (let i = 0; i < lineCount; i++) {
  const a = Math.random() * ringCount;
  const b = Math.random() * ringCount;
  linePts[i * 6] = ringPositions[Math.floor(a) * 3];
  linePts[i * 6 + 1] = ringPositions[Math.floor(a) * 3 + 1];
  linePts[i * 6 + 2] = ringPositions[Math.floor(a) * 3 + 2];
  linePts[i * 6 + 3] = ringPositions[Math.floor(b) * 3];
  linePts[i * 6 + 4] = ringPositions[Math.floor(b) * 3 + 1];
  linePts[i * 6 + 5] = ringPositions[Math.floor(b) * 3 + 2];
}
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePts, 3));
const lineMat = new THREE.LineBasicMaterial({
  color: 0xe87830,
  transparent: true,
  opacity: 0.07,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const lines = new THREE.LineSegments(lineGeo, lineMat);
scene.add(lines);

// ── 鼠标状态 ──
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

function onMouse(e) {
  targetX = (e.clientX / window.innerWidth) * 2 - 1;
  targetY = -(e.clientY / window.innerHeight) * 2 + 1;
}
function onTouch(e) {
  if (e.touches.length) {
    targetX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    targetY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
}
window.addEventListener('mousemove', onMouse, { passive: true });
window.addEventListener('touchmove', onTouch, { passive: true });

// ── 渲染循环 ──
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.1);
  const t = performance.now() * 0.001;

  // 鼠标缓动
  mouseX += (targetX - mouseX) * 0.04;
  mouseY += (targetY - mouseY) * 0.04;

  // 主体旋转 + 鼠标影响
  ico.rotation.x += dt * 0.15;
  ico.rotation.y += dt * 0.2;
  ico.rotation.x += mouseY * dt * 0.3;
  ico.rotation.y += mouseX * dt * 0.3;

  // 透明度呼吸
  icoMat.opacity = 0.22 + Math.sin(t * 0.7) * 0.06;

  // 粒子环旋转
  ring.rotation.x += dt * 0.08;
  ring.rotation.y += dt * 0.12;
  ring.rotation.x += mouseY * dt * 0.2;
  ring.rotation.y += mouseX * dt * 0.2;

  // 连线旋转
  lines.rotation.x = ring.rotation.x;
  lines.rotation.y = ring.rotation.y;

  // 相机微动
  camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
  camera.position.y += (mouseY * 0.3 - camera.position.y) * 0.02;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

// ── 响应式 ──
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ── 启动 ──
animate();
