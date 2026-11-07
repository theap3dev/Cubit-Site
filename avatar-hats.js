import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('hatTryOnCanvas');
const status = document.getElementById('hatTryOnStatus');
const wardrobeStatus = document.getElementById('wornHatStatus');
const form = document.getElementById('hatWardrobeForm');
const select = document.getElementById('ownedHatSelect');
const wearButton = document.getElementById('wearHatBtn');
const removeButton = document.getElementById('removeWornHatBtn');
const loader = new GLTFLoader();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#454b49');

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(4, 4, 11);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

scene.add(new THREE.HemisphereLight(0xffffff, 0x343936, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(4, 7, 5);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xb7dfd6, 1.1);
fillLight.position.set(-4, 3, -3);
scene.add(fillLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.7, 0);
controls.minDistance = 2.5;
controls.maxDistance = 12;
controls.update();

const avatarRoot = new THREE.Group();
const hatAnchor = new THREE.Group();
hatAnchor.position.set(0, 3, 0);
scene.add(avatarRoot, hatAnchor);

let supabase = null;
let accountId = null;
let wornHatId = null;
let ownedHats = [];
let requestId = 0;

function colorKeyForMaterial(name) {
  const normalized = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/smily|smile|face|overlay|head/.test(normalized)) return 'head';
  if (/torso|body|chest/.test(normalized)) return 'torso';
  if (/leftarm|armleft|larm/.test(normalized)) return 'leftArm';
  if (/rightarm|armright|rarm/.test(normalized)) return 'rightArm';
  if (/leftleg|legleft|lleg/.test(normalized)) return 'leftLeg';
  if (/rightleg|legright|rleg/.test(normalized)) return 'rightLeg';
  return null;
}

function applySavedColors(root) {
  const defaults = {
    head: '#f3f1ef',
    torso: '#d7ddee',
    leftArm: '#eef2ff',
    rightArm: '#eef2ff',
    leftLeg: '#c7d1ef',
    rightLeg: '#c7d1ef'
  };
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('cubit-avatar-colors') || '{}');
  } catch {
    saved = {};
  }

  root.traverse((object) => {
    if (!object.isMesh) return;
    const key = colorKeyForMaterial(object.material?.name);
    const color = key && /^#[0-9a-f]{6}$/i.test(saved[key] || '') ? saved[key] : defaults[key];
    if (!color) return;
    object.material.color.set(color);
    object.material.needsUpdate = true;
  });
}

function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function resizePreview() {
  const bounds = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(1, Math.floor(bounds.width));
  const height = Math.max(1, Math.floor(bounds.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function loadWornHat() {
  const hat = ownedHats.find((item) => item.id === wornHatId);
  const request = ++requestId;
  hatAnchor.clear();
  hatAnchor.position.set(0, 3, 0);
  removeButton.disabled = !hat;
  wearButton.disabled = !select.value || select.value === wornHatId;

  if (!hat) {
    setStatus(ownedHats.length ? 'Choose one of your hats to wear.' : 'Get a hat from the Catalog to try it on.');
    return;
  }

  setStatus(`Loading ${hat.name} at (0, 3, 0)...`);
  loader.load(hat.model_url, (gltf) => {
    if (request !== requestId) return;
    hatAnchor.add(gltf.scene);
    setStatus('');
  }, undefined, (error) => {
    if (request !== requestId) return;
    console.error('Could not load worn hat.', error);
    setStatus(`Could not load ${hat.name}.`);
  });
}

async function loadOwnedHats() {
  if (!supabase || !accountId) {
    wardrobeStatus.textContent = 'Sign in to wear hats';
    select.replaceChildren(new Option('Sign in to view your hats', ''));
    select.disabled = true;
    wearButton.disabled = true;
    removeButton.disabled = true;
    ownedHats = [];
    wornHatId = null;
    loadWornHat();
    return;
  }

  wardrobeStatus.textContent = 'Loading your hats';
  const [{ data: collection, error: collectionError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from('user_hats').select('hat_id, hats(id, name, model_url)').eq('user_id', accountId),
    supabase.from('profiles').select('worn_hat_id').eq('id', accountId).maybeSingle()
  ]);

  if (collectionError || profileError) {
    const error = collectionError || profileError;
    wardrobeStatus.textContent = 'Setup required';
    setStatus(error.code === '42P01' || error.code === 'PGRST205' || error.code === '42703' || error.code === 'PGRST204'
      ? 'Run the latest schema.sql to enable wearing hats.'
      : error.message);
    return;
  }

  ownedHats = (collection || []).map((item) => item.hats).filter(Boolean);
  wornHatId = profile?.worn_hat_id || null;
  wardrobeStatus.textContent = `${ownedHats.length} ${ownedHats.length === 1 ? 'hat' : 'hats'}`;

  const options = [new Option('Choose a hat', '')];
  ownedHats.forEach((hat) => options.push(new Option(hat.name, hat.id)));
  select.replaceChildren(...options);
  select.disabled = !ownedHats.length;
  select.value = wornHatId && ownedHats.some((hat) => hat.id === wornHatId) ? wornHatId : '';
  wearButton.disabled = !select.value || select.value === wornHatId;
  removeButton.disabled = !wornHatId;
  loadWornHat();
}

async function saveWornHat(hatId) {
  if (!supabase || !accountId) {
    setStatus('Sign in to wear a hat.');
    return;
  }

  wearButton.disabled = true;
  removeButton.disabled = true;
  const { error } = await supabase.from('profiles').update({ worn_hat_id: hatId }).eq('id', accountId);
  if (error) {
    setStatus(error.message);
    wearButton.disabled = !select.value || select.value === wornHatId;
    removeButton.disabled = !wornHatId;
    return;
  }

  wornHatId = hatId;
  select.value = hatId || '';
  setStatus(hatId ? 'Hat equipped.' : 'Hat removed.');
  loadWornHat();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (select.value) saveWornHat(select.value);
});

select.addEventListener('change', () => {
  wearButton.disabled = !select.value || select.value === wornHatId;
});

removeButton.addEventListener('click', () => saveWornHat(null));

try {
  const gltf = await loader.loadAsync('cublet-textured.glb');
  avatarRoot.add(gltf.scene);
  applySavedColors(gltf.scene);
  setStatus('Choose one of your hats to wear.');
} catch (error) {
  console.error('Could not load avatar try-on model.', error);
  setStatus('Could not load the avatar preview.');
}

await new Promise((resolve) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resolve, { once: true });
  } else {
    resolve();
  }
});

supabase = window.cubitSupabaseClient;
if (!supabase) {
  wardrobeStatus.textContent = 'Account service unavailable';
} else {
  const { data: { session } } = await supabase.auth.getSession();
  accountId = session?.user?.id || null;
  await loadOwnedHats();
  supabase.auth.onAuthStateChange((_event, nextSession) => {
    accountId = nextSession?.user?.id || null;
    loadOwnedHats();
  });
}

new ResizeObserver(resizePreview).observe(canvas.parentElement);
window.addEventListener('resize', resizePreview, { passive: true });
resizePreview();
animate();