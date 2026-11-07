import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('avatarCanvas');
const colorsPanel = document.getElementById('avatarColorsPanel');
const colorsList = document.getElementById('meshColorList');
const colorStatus = document.getElementById('meshColorStatus');
const hatPanel = document.getElementById('avatarHatsPanel');
const hatGrid = document.getElementById('ownedHatGrid');
const hatStatus = document.getElementById('ownedHatStatus');
const facePanel = document.getElementById('avatarFacesPanel');
const faceGrid = document.getElementById('ownedFaceGrid');
const faceStatus = document.getElementById('ownedFaceStatus');
const saveButton = document.getElementById('saveAvatarBtn');
const saveStatus = document.getElementById('avatarSaveStatus');
const defaults = {
  head: '#f3f1ef',
  torso: '#d7ddee',
  leftArm: '#eef2ff',
  rightArm: '#eef2ff',
  leftLeg: '#c7d1ef',
  rightLeg: '#c7d1ef'
};
const colorsKey = 'cubit-avatar-colors';
const imageKey = 'cubit-avatar-profile-image';
const loader = new GLTFLoader();
const faceTextureLoader = new THREE.TextureLoader();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#3d3a3a');

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(4, 4, 11);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
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
let ownedHats = [];
let ownedFaces = [];
let wornHatId = null;
let selectedHatId = null;
let wornFaceId = null;
let selectedFaceId = null;
let hatRequestId = 0;
let faceRequestId = 0;
let faceOverlayMaterial = null;
let defaultFaceTexture = null;
let avatarReady = false;
let palette = readSavedColors();

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

function readSavedColors() {
  try {
    const stored = JSON.parse(localStorage.getItem(colorsKey) || '{}');
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
      const value = stored[key];
      const valid = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
      return [key, valid ? value.toLowerCase() : fallback];
    }));
  } catch {
    return { ...defaults };
  }
}

function forEachBodyMaterial(callback) {
  avatarRoot.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const key = colorKeyForMaterial(material.name);
      if (key) callback(material, key);
    });
  });
}

function applyPalette() {
  forEachBodyMaterial((material, key) => {
    material.color.set(material === faceOverlayMaterial && selectedFaceId ? '#ffffff' : palette[key]);
    material.needsUpdate = true;
  });
}

function applyFaceImage() {
  if (!faceOverlayMaterial) return;
  const requestId = ++faceRequestId;
  const face = ownedFaces.find((item) => item.id === selectedFaceId);
  if (!face) {
    faceOverlayMaterial.map = defaultFaceTexture;
    faceOverlayMaterial.color.set(palette.head);
    faceOverlayMaterial.needsUpdate = true;
    return;
  }

  faceStatus.textContent = `Loading ${face.name}...`;
  faceTextureLoader.load(face.image_url, (texture) => {
    if (requestId !== faceRequestId) {
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
    faceStatus.textContent = `${face.name} selected`;
  }, undefined, (error) => {
    if (requestId !== faceRequestId) return;
    console.error('Could not load face image.', error);
    faceStatus.textContent = `Could not load ${face.name}.`;
  });
}

function buildColorControls() {
  const materialNames = new Map();
  forEachBodyMaterial((material, key) => {
    if (!materialNames.has(key)) materialNames.set(key, material.name || key);
  });

  colorsList.replaceChildren();
  Object.entries(defaults).forEach(([key]) => {
    if (!materialNames.has(key)) return;
    const label = document.createElement('label');
    label.className = 'mesh-color-control';
    const name = document.createElement('span');
    name.textContent = materialNames.get(key);
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = palette[key];
    picker.dataset.avatarColorKey = key;
    picker.setAttribute('aria-label', `Color for ${materialNames.get(key)}`);
    const updateColor = () => {
      palette[key] = picker.value.toLowerCase();
      applyPalette();
      saveStatus.textContent = 'Unsaved changes';
    };
    picker.addEventListener('input', updateColor);
    picker.addEventListener('change', updateColor);
    label.append(name, picker);
    colorsList.appendChild(label);
  });

  colorStatus.hidden = colorsList.children.length > 0;
  if (!colorsList.children.length) colorStatus.textContent = 'No editable body materials found.';
}

function updateSaveButton(message) {
  saveStatus.textContent = message;
  saveButton.textContent = message === 'Saved' ? 'Saved' : 'Save';
  if (message === 'Saved') {
    saveButton.disabled = true;
    window.clearTimeout(updateSaveButton.timer);
    updateSaveButton.timer = window.setTimeout(() => {
      saveButton.textContent = 'Save';
      saveButton.disabled = false;
      saveStatus.textContent = '';
    }, 1400);
  } else {
    saveButton.disabled = false;
  }
}

function setSelectedHat(hatId, markUnsaved = true) {
  selectedHatId = hatId;
  hatGrid.querySelectorAll('[data-hat-id]').forEach((button) => {
    const selected = button.dataset.hatId === selectedHatId;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  loadHatPreview();
  if (markUnsaved && selectedHatId !== wornHatId) saveStatus.textContent = 'Unsaved changes';
}

function setSelectedFace(faceId, markUnsaved = true) {
  selectedFaceId = faceId;
  faceGrid.querySelectorAll('[data-face-id]').forEach((button) => {
    const selected = button.dataset.faceId === selectedFaceId;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  applyFaceImage();
  if (markUnsaved && selectedFaceId !== wornFaceId) saveStatus.textContent = 'Unsaved changes';
}

function loadHatPreview() {
  const requestId = ++hatRequestId;
  hatAnchor.clear();
  hatAnchor.position.set(0, 3, 0);
  const hat = ownedHats.find((item) => item.id === selectedHatId);
  if (!hat) {
    hatStatus.textContent = ownedHats.length ? 'Select a hat to try it on.' : 'Get hats from the Catalog.';
    return;
  }

  hatStatus.textContent = `Loading ${hat.name} at (0, 3, 0)...`;
  loader.load(hat.model_url, (gltf) => {
    if (requestId !== hatRequestId) return;
    hatAnchor.add(gltf.scene);
    hatStatus.textContent = selectedHatId === wornHatId ? `Wearing ${hat.name}` : `Previewing ${hat.name}`;
  }, undefined, (error) => {
    if (requestId !== hatRequestId) return;
    console.error('Could not load hat preview.', error);
    hatStatus.textContent = `Could not load ${hat.name}.`;
  });
}

function renderHatGrid() {
  hatGrid.replaceChildren();
  if (!ownedHats.length) {
    hatGrid.textContent = 'You do not have any hats yet.';
    return;
  }

  ownedHats.forEach((hat) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hat-tile';
    button.dataset.hatId = hat.id;
    button.setAttribute('aria-pressed', String(hat.id === selectedHatId));
    button.classList.toggle('selected', hat.id === selectedHatId);
    const type = document.createElement('span');
    type.className = 'hat-tile-type';
    type.textContent = '3D HAT';
    const name = document.createElement('span');
    name.className = 'hat-tile-name';
    name.textContent = hat.name;
    const state = document.createElement('span');
    state.className = 'hat-tile-state';
    state.textContent = hat.id === wornHatId ? 'Wearing' : 'Select';
    button.append(type, name, state);
    hatGrid.appendChild(button);
  });
}

function renderFaceGrid() {
  faceGrid.replaceChildren();
  if (!ownedFaces.length) {
    faceGrid.textContent = 'You do not have any faces yet.';
    return;
  }

  ownedFaces.forEach((face) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'face-tile';
    button.dataset.faceId = face.id;
    button.setAttribute('aria-pressed', String(face.id === selectedFaceId));
    button.classList.toggle('selected', face.id === selectedFaceId);
    const image = document.createElement('img');
    image.src = face.image_url;
    image.alt = '';
    const name = document.createElement('span');
    name.textContent = face.name;
    button.append(image, name);
    faceGrid.appendChild(button);
  });
}

async function loadWardrobe() {
  if (!supabase || !accountId) {
    ownedHats = [];
    ownedFaces = [];
    selectedHatId = null;
    wornHatId = null;
    selectedFaceId = null;
    wornFaceId = null;
    hatStatus.textContent = 'Sign in to view your hats.';
    faceStatus.textContent = 'Sign in to view your faces.';
    hatGrid.replaceChildren();
    hatGrid.textContent = 'Sign in to view your collection.';
    faceGrid.replaceChildren();
    faceGrid.textContent = 'Sign in to view your collection.';
    return;
  }

  hatStatus.textContent = 'Loading your hats...';
  faceStatus.textContent = 'Loading your faces...';
  const [
    { data: collection, error: collectionError },
    { data: faceCollection, error: faceCollectionError },
    { data: profile, error: profileError }
  ] = await Promise.all([
    supabase.from('user_hats').select('hat_id, hats(id, name, model_url)').eq('user_id', accountId),
    supabase.from('user_faces').select('face_id, faces(id, name, image_url)').eq('user_id', accountId),
    supabase.from('profiles').select('avatar_colors, worn_hat_id, worn_face_id').eq('id', accountId).maybeSingle()
  ]);

  if (collectionError || faceCollectionError || profileError) {
    const error = collectionError || faceCollectionError || profileError;
    hatStatus.textContent = error.code === '42P01' || error.code === 'PGRST205' || error.code === '42703' || error.code === 'PGRST204'
      ? 'Run the latest schema.sql to enable hats.'
      : error.message;
    faceStatus.textContent = hatStatus.textContent;
    return;
  }

  ownedHats = (collection || []).map((item) => item.hats).filter(Boolean);
  ownedFaces = (faceCollection || []).map((item) => item.faces).filter(Boolean);
  wornHatId = profile?.worn_hat_id || null;
  wornFaceId = profile?.worn_face_id || null;
  selectedHatId = ownedHats.some((hat) => hat.id === wornHatId) ? wornHatId : null;
  selectedFaceId = ownedFaces.some((face) => face.id === wornFaceId) ? wornFaceId : null;
  if (profile?.avatar_colors) {
    const savedPalette = readSavedColors();
    const serverPalette = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
      const color = profile.avatar_colors[key];
      return [key, typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback];
    }));
    const serverHasDefaults = Object.entries(defaults).every(([key, fallback]) => serverPalette[key] === fallback);
    const savedPaletteIsCustom = Object.entries(defaults).some(([key, fallback]) => savedPalette[key] !== fallback);
    palette = serverHasDefaults && savedPaletteIsCustom ? savedPalette : serverPalette;
    if (serverHasDefaults && savedPaletteIsCustom) {
      const { error: syncError } = await supabase.from('profiles')
        .update({ avatar_colors: palette })
        .eq('id', accountId);
      if (syncError) console.error('Could not sync saved avatar colors to the profile.', syncError);
    }
    localStorage.setItem(colorsKey, JSON.stringify(palette));
    colorsList.querySelectorAll('input[data-avatar-color-key]').forEach((picker) => {
      picker.value = palette[picker.dataset.avatarColorKey];
    });
    applyPalette();
  }
  hatStatus.textContent = `${ownedHats.length} ${ownedHats.length === 1 ? 'hat' : 'hats'}`;
  faceStatus.textContent = `${ownedFaces.length} ${ownedFaces.length === 1 ? 'face' : 'faces'}`;
  renderHatGrid();
  renderFaceGrid();
  loadHatPreview();
  applyFaceImage();
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

function captureProfileImage() {
  const size = renderer.getSize(new THREE.Vector2());
  const originalPosition = camera.position.clone();
  const originalTarget = controls.target.clone();
  const originalAspect = camera.aspect;
  const originalFov = camera.fov;

  controls.enabled = false;
  renderer.setSize(256, 256, false);
  camera.aspect = 1;
  camera.fov = 30;
  camera.position.set(0, 2.7, 6);
  controls.target.set(0, 2.7, 0);
  camera.updateProjectionMatrix();
  controls.update();
  renderer.render(scene, camera);
  const image = canvas.toDataURL('image/png');

  camera.position.copy(originalPosition);
  controls.target.copy(originalTarget);
  camera.aspect = originalAspect;
  camera.fov = originalFov;
  camera.updateProjectionMatrix();
  controls.enabled = true;
  controls.update();
  renderer.setSize(size.x, size.y, false);
  renderer.render(scene, camera);
  return image;
}

async function saveAvatar() {
  if (!avatarReady) return;
  saveButton.disabled = true;
  updateSaveButton('Saving...');

  colorsList.querySelectorAll('input[data-avatar-color-key]').forEach((picker) => {
    palette[picker.dataset.avatarColorKey] = picker.value.toLowerCase();
  });
  applyPalette();

  if (supabase && accountId) {
    const { error } = await supabase.from('profiles')
      .update({
        avatar_colors: palette,
        worn_hat_id: selectedHatId,
        worn_face_id: selectedFaceId
      })
      .eq('id', accountId);
    if (error) {
      updateSaveButton(error.message);
      return;
    }
    wornHatId = selectedHatId;
    wornFaceId = selectedFaceId;
    renderHatGrid();
    renderFaceGrid();
    loadHatPreview();
    applyFaceImage();
  }

  try {
    localStorage.setItem(colorsKey, JSON.stringify(palette));
    localStorage.setItem(imageKey, captureProfileImage());
    updateSaveButton('Saved');
  } catch (error) {
    updateSaveButton(error.message || 'Could not save avatar.');
  }
}

document.querySelectorAll('.avatar-editor-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const selectedPanel = tab.dataset.avatarPanel;
    document.querySelectorAll('.avatar-editor-tab').forEach((candidate) => {
      const selected = candidate === tab;
      candidate.classList.toggle('active', selected);
      candidate.setAttribute('aria-selected', String(selected));
    });
    [colorsPanel, hatPanel, facePanel].forEach((panel) => {
      panel.hidden = panel.id !== selectedPanel;
    });
  });
});

hatGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-hat-id]');
  if (button) setSelectedHat(button.dataset.hatId === selectedHatId ? null : button.dataset.hatId);
});

faceGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-face-id]');
  if (button) setSelectedFace(button.dataset.faceId === selectedFaceId ? null : button.dataset.faceId);
});

saveButton.addEventListener('click', saveAvatar);

try {
  const gltf = await loader.loadAsync('cublet-textured.glb');
  avatarRoot.add(gltf.scene);
  forEachBodyMaterial((material) => {
    if (/smily|smile|face|overlay/i.test(material.name || '')) {
      faceOverlayMaterial = material;
      defaultFaceTexture = material.map;
    }
  });
  applyPalette();
  buildColorControls();
  avatarReady = true;
  colorStatus.hidden = true;
} catch (error) {
  console.error('Could not load avatar model.', error);
  colorStatus.hidden = false;
  colorStatus.textContent = 'Could not load the player model.';
  saveButton.disabled = true;
}

await new Promise((resolve) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resolve, { once: true });
  } else {
    resolve();
  }
});

supabase = window.cubitSupabaseClient;
if (supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  accountId = session?.user?.id || null;
  await loadWardrobe();
  supabase.auth.onAuthStateChange((_event, nextSession) => {
    accountId = nextSession?.user?.id || null;
    loadWardrobe();
  });
} else {
  hatStatus.textContent = 'Account service unavailable.';
}

hatPanel.querySelector('[data-avatar-panel-status]')?.addEventListener('click', () => {});
new ResizeObserver(resizeViewer).observe(canvas.parentElement);
window.addEventListener('resize', resizeViewer, { passive: true });
resizeViewer();
animate();