import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('profileAvatar3D');
const status = document.getElementById('profileAvatar3DStatus');
const defaults = {
  head: '#f3f1ef',
  torso: '#d7ddee',
  leftArm: '#eef2ff',
  rightArm: '#eef2ff',
  leftLeg: '#c7d1ef',
  rightLeg: '#c7d1ef'
};
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(4, 4, 11);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
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

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const avatarRoot = new THREE.Group();
const hatAnchor = new THREE.Group();
hatAnchor.position.set(0, 3, 0);
scene.add(avatarRoot, hatAnchor);

let profileState = null;
let avatarReady = false;
let defaultFaceTexture = null;
let faceOverlayMaterial = null;
let updateId = 0;

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

function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function applyColors(colors, hasCustomFace) {
  const palette = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const color = colors?.[key];
    return [key, typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback];
  }));

  avatarRoot.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const key = colorKeyForMaterial(material.name);
      if (!key) return;
      material.color.set(material === faceOverlayMaterial && hasCustomFace ? '#ffffff' : palette[key]);
    });
  });
}

async function loadProfileAssets(state, requestId) {
  const supabase = window.cubitSupabaseClient;
  if (!supabase) {
    setStatus('Profile asset service unavailable.');
    return;
  }

  const [hatResult, faceResult] = await Promise.all([
    state.wornHatId
      ? supabase.from('hats').select('model_url').eq('id', state.wornHatId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    state.wornFaceId
      ? supabase.from('faces').select('image_url').eq('id', state.wornFaceId).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (requestId !== updateId) return;
  if (hatResult.error || faceResult.error) {
    setStatus('Could not load this avatar’s accessories.');
    return;
  }

  hatAnchor.clear();
  if (hatResult.data?.model_url) {
    loader.load(hatResult.data.model_url, (gltf) => {
      if (requestId === updateId) hatAnchor.add(gltf.scene);
    }, undefined, (error) => {
      console.error('Could not load the profile hat.', error);
      if (requestId === updateId) setStatus('Could not load this avatar’s hat.');
    });
  }

  if (faceOverlayMaterial) {
    if (!faceResult.data?.image_url) {
      if (faceOverlayMaterial.map && faceOverlayMaterial.map !== defaultFaceTexture) {
        faceOverlayMaterial.map.dispose();
      }
      faceOverlayMaterial.map = defaultFaceTexture;
      faceOverlayMaterial.color.set(state.colors?.head || defaults.head);
      faceOverlayMaterial.needsUpdate = true;
      setStatus('');
      return;
    }

    textureLoader.load(faceResult.data.image_url, (texture) => {
      if (requestId !== updateId) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      if (faceOverlayMaterial.map && faceOverlayMaterial.map !== defaultFaceTexture) {
        faceOverlayMaterial.map.dispose();
      }
      faceOverlayMaterial.map = texture;
      faceOverlayMaterial.color.set('#ffffff');
      faceOverlayMaterial.needsUpdate = true;
      setStatus('');
    }, undefined, (error) => {
      console.error('Could not load the profile face.', error);
      if (requestId === updateId) setStatus('Could not load this avatar’s face.');
    });
    return;
  }

  setStatus('');
}

async function updateProfileAvatar(state) {
  profileState = state;
  if (!avatarReady) return;
  const requestId = ++updateId;
  applyColors(state.colors, Boolean(state.wornFaceId));
  await loadProfileAssets(state, requestId);
  if (requestId === updateId && state.needsSchema) {
    setStatus('Run the latest schema.sql to sync this saved avatar across profiles.');
  }
}

function resizeViewer() {
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

window.addEventListener('cubit-profile-avatar', (event) => updateProfileAvatar(event.detail));

try {
  const gltf = await loader.loadAsync('cublet-textured.glb');
  avatarRoot.add(gltf.scene);
  avatarRoot.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (/smily|smile|face|overlay/i.test(material.name || '')) {
        faceOverlayMaterial = material;
        defaultFaceTexture = material.map;
      }
    });
  });
  avatarReady = true;
  if (profileState) await updateProfileAvatar(profileState);
  else setStatus('');
} catch (error) {
  console.error('Could not load profile avatar model.', error);
  setStatus('Could not load this avatar.');
}

new ResizeObserver(resizeViewer).observe(canvas.parentElement);
window.addEventListener('resize', resizeViewer, { passive: true });
resizeViewer();
animate();

if (window.cubitProfileAvatarState) {
  updateProfileAvatar(window.cubitProfileAvatarState);
}