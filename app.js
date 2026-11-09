const supabaseUrl = 'https://piqcpacngbkczjbyutmf.supabase.co';
const supabaseAnonKey = 'sb_publishable_rR3_v4OuYaQ26SGLXUHpYA_VSwoCa2D';

const statusMessage = document.getElementById('statusMessage');

const isSupabaseConfigured =
  supabaseUrl &&
  !supabaseUrl.includes('YOUR_') &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('YOUR_') &&
  typeof window.supabase !== 'undefined';

const supabaseClient = isSupabaseConfigured
  ? window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

if (!isSupabaseConfigured) {
  setStatus('Add your Supabase URL and anon key in app.js to enable auth.', 'info');
}
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const signedInState = document.getElementById('signedInState');
const userEmail = document.getElementById('userEmail');
const signOutBtn = document.getElementById('signOutBtn');
const tabButtons = document.querySelectorAll('.tab-btn');
const gameCreateForm = document.getElementById('gameCreateForm');
const authTabs = document.querySelector('.auth-tabs');
const createGameLink = document.getElementById('createGameLink');
const topbarAccount = document.getElementById('topbarAccount');
const gameWorkspace = document.getElementById('gameWorkspace');
const loginRequired = document.getElementById('loginRequired');
const gamesList = document.getElementById('gamesList');
const gameDetail = document.getElementById('gameDetail');
const gameEditForm = document.getElementById('gameEditForm');
const editGameButton = document.getElementById('editGameButton');
const deleteGameButton = document.getElementById('deleteGameButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const gameTitleDisplay = document.getElementById('gameTitleDisplay');
const gameVisibilityDisplay = document.getElementById('gameVisibilityDisplay');
const gameOverview = document.getElementById('gameOverview');
const creatorAccountName = document.getElementById('creatorAccountName');
const ownedGamesList = document.getElementById('ownedGamesList');
const ownedGamesStatus = document.getElementById('ownedGamesStatus');
const manageGameEditForm = document.getElementById('manageGameEditForm');
const hatUploadForm = document.getElementById('hatUploadForm');
const faceUploadForm = document.getElementById('faceUploadForm');
const uploadedHatsList = document.getElementById('uploadedHatsList');
const uploadedFacesList = document.getElementById('uploadedFacesList');
const hatUploadAccess = document.getElementById('hatUploadAccess');
const hatUploadDescription = document.getElementById('hatUploadDescription');
const catalogList = document.getElementById('catalogList');
const catalogCount = document.getElementById('catalogCount');
let currentUser = null;
let currentGame = null;
let currentOwnedGames = [];
window.cubitSupabaseClient = supabaseClient;
window.cubitCurrentUser = null;

function setStatus(message, type = 'info') {
  statusMessage.textContent = message || '';
  statusMessage.className = `status-message ${type}`;
}

function setActiveTab(tabName) {
  const isSignIn = tabName === 'signin';

  tabButtons.forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  if (signInForm) {
    signInForm.classList.toggle('active', isSignIn);
    signInForm.hidden = !isSignIn;
  }

  if (signUpForm) {
    signUpForm.classList.toggle('active', !isSignIn);
    signUpForm.hidden = isSignIn;
  }
}

function updateAuthUI(session) {
  const user = session?.user;
  currentUser = user || null;
  window.cubitCurrentUser = currentUser;

  if (userEmail) {
    userEmail.textContent = user?.email || '';
  }

  if (signedInState) {
    signedInState.hidden = !user;
  }

  if (authTabs) {
    authTabs.hidden = Boolean(user);
  }

  if (createGameLink) {
    createGameLink.hidden = !user;
  }

  if (topbarAccount) {
    topbarAccount.hidden = !user;
  }

  if (gameWorkspace) {
    gameWorkspace.hidden = !user;
  }

  if (creatorAccountName) {
    creatorAccountName.textContent = user ? getDisplayName(session) : '';
  }

  if (loginRequired) {
    loginRequired.hidden = Boolean(user);
  }

  if (user) {
    if (signInForm) {
      signInForm.hidden = true;
    }

    if (signUpForm) {
      signUpForm.hidden = true;
    }

    showAuthScreen(false);
  } else {
    showAuthScreen(true);

    if (signInForm && signUpForm) {
      setActiveTab('signin');
    }
  }
}

function getDisplayName(session) {
  const metadataName = session?.user?.user_metadata?.username;
  const emailName = session?.user?.email?.split('@')[0];
  return metadataName || emailName || 'ap3';
}

function showAuthScreen(showAuth) {
  const authShell = document.getElementById('authShell');
  const homeShell = document.getElementById('homeShell');

  if (authShell) {
    authShell.hidden = !showAuth;
  }

  if (homeShell) {
    homeShell.hidden = showAuth;
  }

  document.body.classList.toggle('auth-page', showAuth);
  document.body.classList.toggle('home-page', !showAuth);
}

function updateHomeUser(session) {
  const username = getDisplayName(session);

  const welcomeName = document.querySelector('.username');
  const userDisplay = document.querySelector('.user-name');
  const logoutButton = document.querySelector('.logout-btn');

  if (welcomeName) {
    welcomeName.textContent = username;
  }

  if (userDisplay) {
    userDisplay.textContent = username;
  }

  if (logoutButton) {
    logoutButton.hidden = !session?.user;
  }
}

function setActiveNavPage(pageName) {
  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach((button) => {
    const isActive = button.dataset.page === pageName;
    button.classList.toggle('active', isActive);
  });

  const views = document.querySelectorAll('.content-view');
  views.forEach((view) => {
    const isVisible = view.id === `${pageName}View`;
    view.hidden = !isVisible;
    view.classList.toggle('active-view', isVisible);
  });
}

function navigateHomeRoute(route) {
  if (window.location.hash === `#${route}`) {
    handleHomeRoute();
  } else {
    window.location.hash = route;
  }
}

function handleHomeRoute() {
  const route = window.location.hash.slice(1);
  const profilePrefix = 'profile/';

  if (route.startsWith(profilePrefix)) {
    let profileId = '';
    try {
      profileId = decodeURIComponent(route.slice(profilePrefix.length));
    } catch {
      profileId = '';
    }
    setActiveNavPage('profile');
    loadUserProfile(profileId);
    return;
  }

  const page = ['home', 'users'].includes(route) ? route : 'home';
  setActiveNavPage(page);
  document.title = 'Cubit';
  if (page === 'users') {
    loadUsers();
  }
}

function createGameThumbnail(game, className) {
  const link = document.createElement('a');
  link.className = className;
  link.href = `game.html?id=${encodeURIComponent(game.id)}`;
  link.setAttribute('aria-label', `Open ${game.title || 'Untitled game'}`);

  if (game.thumbnail_url) {
    const image = document.createElement('img');
    image.src = game.thumbnail_url;
    image.alt = `${game.title || 'Untitled game'} thumbnail`;
    link.appendChild(image);
  }

  return link;
}

const AVATAR_COLORS_KEY = 'cubit-avatar-colors';
const AVATAR_PROFILE_IMAGE_KEY = 'cubit-avatar-profile-image';

normalizeStoredAvatarColors();

function getDefaultAvatarColors() {
  return {
    head: '#f3f1ef',
    torso: '#d7ddee',
    leftArm: '#eef2ff',
    rightArm: '#eef2ff',
    leftLeg: '#c7d1ef',
    rightLeg: '#c7d1ef'
  };
}

function normalizeHexColor(value, fallback) {
  const valid = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '')) ? String(value) : fallback;
  if (valid.length === 4) {
    return `#${valid.slice(1).split('').map((char) => char + char).join('')}`;
  }

  return valid;
}

function normalizeStoredAvatarColors() {
  try {
    const raw = window.localStorage.getItem(AVATAR_COLORS_KEY);
    if (!raw) {
      return getDefaultAvatarColors();
    }

    const parsed = JSON.parse(raw);
    const defaults = getDefaultAvatarColors();
    const normalized = {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(parsed || {}).map(([key, value]) => {
          return [key, normalizeHexColor(value, defaults[key] || '#ffffff')];
        })
      )
    };

    window.localStorage.setItem(AVATAR_COLORS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return getDefaultAvatarColors();
  }
}

function getStoredAvatarColors() {
  try {
    const raw = window.localStorage.getItem(AVATAR_COLORS_KEY);
    if (!raw) {
      return getDefaultAvatarColors();
    }

    const parsed = JSON.parse(raw);
    const defaults = getDefaultAvatarColors();

    return {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(parsed || {}).map(([key, value]) => {
          return [key, normalizeHexColor(value, defaults[key] || '#ffffff')];
        })
      )
    };
  } catch {
    return getDefaultAvatarColors();
  }
}

function buildAvatarProfileSvg(colors) {
  const palette = {
    head: normalizeHexColor(colors.head, '#f3f1ef'),
    torso: normalizeHexColor(colors.torso, '#d7ddee'),
    leftArm: normalizeHexColor(colors.leftArm, '#eef2ff'),
    rightArm: normalizeHexColor(colors.rightArm, '#eef2ff'),
    leftLeg: normalizeHexColor(colors.leftLeg, '#c7d1ef'),
    rightLeg: normalizeHexColor(colors.rightLeg, '#c7d1ef')
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Player headshot avatar">
      <rect width="128" height="128" rx="24" fill="#16181d"/>
      <ellipse cx="64" cy="100" rx="34" ry="18" fill="${palette.torso}"/>
      <circle cx="64" cy="48" r="28" fill="${palette.head}"/>
      <path d="M42 56 Q64 74 86 56 L86 76 Q64 92 42 76 Z" fill="${palette.torso}" opacity="0.95"/>
      <circle cx="55" cy="47" r="2.5" fill="#000000" fill-opacity="0.32"/>
      <circle cx="73" cy="47" r="2.5" fill="#000000" fill-opacity="0.32"/>
      <path d="M55 62 Q64 68 73 62" stroke="#000000" stroke-opacity="0.35" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="48" y="72" width="32" height="8" rx="4" fill="#000000" fill-opacity="0.10"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function saveAvatarProfileImage(colors) {
  const profileImage = buildAvatarProfileSvg(colors);
  try {
    window.localStorage.setItem(AVATAR_COLORS_KEY, JSON.stringify(colors));
    window.localStorage.setItem(AVATAR_PROFILE_IMAGE_KEY, profileImage);
  } catch {
    // Ignore storage failures so the page remains usable offline.
  }
  return profileImage;
}

function getSavedAvatarProfileImage() {
  try {
    const saved = window.localStorage.getItem(AVATAR_PROFILE_IMAGE_KEY);
    if (saved && /^data:image\/png/i.test(saved)) {
      return saved;
    }

    if (saved && /^data:image\/svg\+xml/i.test(saved)) {
      window.localStorage.removeItem(AVATAR_PROFILE_IMAGE_KEY);
    }
  } catch {
    // Ignore storage access failures.
  }

  return '';
}

function renderProfileAvatarImage(container, fallbackText, imageUrl) {
  if (!container) {
    return;
  }

  container.replaceChildren();

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = 'Player profile avatar';
    container.appendChild(image);
    return;
  }

  if (fallbackText) {
    container.textContent = fallbackText;
  }
}

function resolveUserAvatarUrl(user) {
  try {
    const storedProfileImage = window.localStorage.getItem(AVATAR_PROFILE_IMAGE_KEY);
    if (storedProfileImage && /^data:image\/png/i.test(storedProfileImage)) {
      return storedProfileImage;
    }

    if (storedProfileImage && /^data:image\/svg\+xml/i.test(storedProfileImage)) {
      window.localStorage.removeItem(AVATAR_PROFILE_IMAGE_KEY);
    }
  } catch {
    // Ignore storage access failures and fall through.
  }

  if (user?.avatar_url && /^data:image\/png/i.test(user.avatar_url)) {
    return user.avatar_url;
  }

  return '';
}

function renderUsersList(users) {
  const container = document.getElementById('usersList');
  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!users?.length) {
    container.innerHTML = '<div class="empty-state">No users found.</div>';
    return;
  }

  users.forEach((user) => {
    const row = document.createElement('a');
    row.className = 'user-row';
    row.href = `#profile/${encodeURIComponent(user.id)}`;

    const avatar = document.createElement('span');
    avatar.className = 'mini-avatar';
    const userAvatarUrl = resolveUserAvatarUrl(user);

    if (userAvatarUrl) {
      avatar.style.backgroundImage = `url(${userAvatarUrl})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.style.backgroundRepeat = 'no-repeat';
      avatar.style.border = '1px solid rgba(255,255,255,0.24)';
      avatar.style.borderRadius = '6px';
    }

    const name = document.createElement('span');
    name.textContent = user.username || user.email || 'User';

    row.append(avatar, name);
    container.appendChild(row);
  });
}

function renderProfileGames(games) {
  const container = document.getElementById('profileGames');
  const count = document.getElementById('profileGameCount');
  if (!container || !count) {
    return;
  }

  count.textContent = `${games.length} ${games.length === 1 ? 'game' : 'games'}`;

  if (!games.length) {
    const emptyState = document.createElement('li');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No games to show yet.';
    container.replaceChildren(emptyState);
    return;
  }

  const items = games.map((game) => {
    const item = document.createElement('li');
    item.className = 'game-item';

    const thumbnail = createGameThumbnail(game, 'game-list-thumbnail');
    const heading = document.createElement('div');
    heading.className = 'game-item-heading';
    const title = document.createElement('h2');
    const titleLink = document.createElement('a');
    titleLink.href = `game.html?id=${encodeURIComponent(game.id)}`;
    titleLink.className = 'game-title-link';
    titleLink.textContent = game.title || 'Untitled game';
    title.appendChild(titleLink);
    heading.appendChild(title);
    item.append(thumbnail, heading);
    return item;
  });

  container.replaceChildren(...items);
}

async function loadUserProfile(profileId) {
  const avatar = document.getElementById('profileAvatar');
  const username = document.getElementById('profileUsername');
  const joined = document.getElementById('profileJoined');
  const status = document.getElementById('profileStatus');
  const games = document.getElementById('profileGames');
  const gameCount = document.getElementById('profileGameCount');

  if (!avatar || !username || !joined || !status || !games || !gameCount) {
    return;
  }

  avatar.replaceChildren();
  username.textContent = '';
  joined.textContent = '';
  games.replaceChildren();
  gameCount.textContent = '';
  status.textContent = 'Loading profile...';

  if (!profileId || !supabaseClient) {
    status.textContent = 'This profile could not be loaded.';
    return;
  }

  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .eq('id', profileId)
      .maybeSingle();

    if (error || !profile) {
      status.textContent = error?.message || 'This profile could not be found.';
      return;
    }

    const { data: avatarState, error: avatarStateError } = await supabaseClient
      .from('profiles')
      .select('avatar_colors, worn_hat_id, worn_face_id')
      .eq('id', profileId)
      .maybeSingle();
    const needsSchema = ['42703', 'PGRST204'].includes(avatarStateError?.code);
    let avatarColors = avatarState?.avatar_colors || {};
    const defaults = getDefaultAvatarColors();
    const localColors = getStoredAvatarColors();
    const serverHasDefaults = Object.entries(defaults).every(([key, fallback]) =>
      normalizeHexColor(avatarColors[key], fallback) === fallback
    );
    const localHasCustomColors = Object.entries(defaults).some(([key, fallback]) => localColors[key] !== fallback);

    if (currentUser?.id === profileId && localHasCustomColors && (needsSchema || serverHasDefaults)) {
      avatarColors = localColors;
      if (!needsSchema) {
        const { error: syncError } = await supabaseClient
          .from('profiles')
          .update({ avatar_colors: avatarColors })
          .eq('id', profileId);
        if (syncError) console.error('Could not sync saved avatar colors to the profile.', syncError);
      }
    }

    username.textContent = profile.username || 'User';
    const avatarImageUrl = resolveUserAvatarUrl(profile);
    renderProfileAvatarImage(avatar, (profile.username || 'U').slice(0, 1).toUpperCase(), avatarImageUrl || '');
    window.cubitProfileAvatarState = {
      profileId: profile.id,
      colors: avatarColors,
      wornHatId: avatarState?.worn_hat_id || null,
      wornFaceId: avatarState?.worn_face_id || null,
      needsSchema
    };
    window.dispatchEvent(new CustomEvent('cubit-profile-avatar', { detail: window.cubitProfileAvatarState }));

    const joinedDate = profile.created_at ? new Date(profile.created_at) : null;
    joined.textContent = joinedDate && !Number.isNaN(joinedDate.getTime())
      ? `Joined ${joinedDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          timeZone: 'UTC'
        })}`
      : '';
    status.textContent = needsSchema
      ? 'Run the latest schema.sql to share saved avatar colors and accessories on every profile.'
      : avatarStateError ? 'Avatar settings could not be loaded.' : '';
    document.title = `${profile.username || 'User'} - Cubit`;

    const { data: profileGames, error: gamesError } = await supabaseClient
      .from('games')
      .select('id, title, thumbnail_url')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });

    if (gamesError) {
      status.textContent = 'Could not load this user’s games.';
      return;
    }

    renderProfileGames(profileGames || []);
  } catch (error) {
    console.error('Could not load profile.', error);
    status.textContent = 'Unable to load this profile right now.';
  }
}

async function loadUsers() {
  const container = document.getElementById('usersList');
  if (!container || !supabaseClient) {
    return;
  }

  try {
    const { data: users, error } = await supabaseClient
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      const message = error.code === '42P01' || error.code === 'PGRST205'
        ? 'Run schema.sql in the Supabase SQL Editor to create the profiles table.'
        : error.message;

      container.innerHTML = `<div class="empty-state">${message}</div>`;
      return;
    }

    renderUsersList(users || []);
  } catch (error) {
    console.error('Could not load users.', error);
    container.innerHTML = '<div class="empty-state">Unable to load users.</div>';
  }
}

function createHomeGameCard(game) {
  const article = document.createElement('article');
  article.className = 'game-card';

  const box = createGameThumbnail(game, 'card-box game-thumbnail-link');

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const title = document.createElement('span');
  title.textContent = game.title || 'Untitled game';

  const details = document.createElement('span');
  details.textContent = '67';

  meta.append(title, details);
  article.append(box, meta);
  return article;
}

function renderGameListMessage(container, message) {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.textContent = message;
  container.replaceChildren(emptyState);
}

async function loadHomeGames() {
  if (!document.body.classList.contains('home-page') || !supabaseClient) {
    return;
  }

  const recentlyPlayedCards = document.getElementById('recentlyPlayedCards');
  const mostActiveCards = document.getElementById('mostActiveCards');

  if (!recentlyPlayedCards || !mostActiveCards) {
    return;
  }

  try {
    const { data: games, error } = await supabaseClient
      .from('games')
      .select('id, title, visibility, created_at, thumbnail_url')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      console.error('Failed to load home games:', error);
      recentlyPlayedCards.innerHTML = '';
      mostActiveCards.innerHTML = '';
      return;
    }

    const active = games?.slice(0, 6) || [];

    mostActiveCards.replaceChildren(...active.map(createHomeGameCard));

    if (!currentUser) {
      renderGameListMessage(recentlyPlayedCards, 'Sign in to track recently played games.');
    } else {
      const { data: recentPlays, error: recentError } = await supabaseClient
        .from('recently_played')
        .select('game_id, last_played_at')
        .eq('user_id', currentUser.id)
        .order('last_played_at', { ascending: false })
        .limit(4);

      if (recentError) {
        console.error('Failed to load recently played games:', recentError);
        const message = recentError.code === '42P01' || recentError.code === 'PGRST205'
          ? 'Run schema.sql to enable recently played games.'
          : 'Could not load recently played games.';
        renderGameListMessage(recentlyPlayedCards, message);
      } else if (!recentPlays?.length) {
        renderGameListMessage(recentlyPlayedCards, 'No recently played games yet.');
      } else {
        const gameIds = recentPlays.map((play) => play.game_id);
        const { data: recentGames, error: recentGamesError } = await supabaseClient
          .from('games')
          .select('id, title, visibility, thumbnail_url')
          .in('id', gameIds);

        if (recentGamesError) {
          console.error('Failed to load recently played game details:', recentGamesError);
          renderGameListMessage(recentlyPlayedCards, 'Could not load recently played games.');
        } else {
          const gamesById = new Map((recentGames || []).map((game) => [game.id, game]));
          const orderedRecentGames = gameIds
            .map((gameId) => gamesById.get(gameId))
            .filter(Boolean);
          if (orderedRecentGames.length) {
            recentlyPlayedCards.replaceChildren(...orderedRecentGames.map(createHomeGameCard));
          } else {
            renderGameListMessage(recentlyPlayedCards, 'No recently played games yet.');
          }
        }
      }
    }

    if (!games?.length) {
      mostActiveCards.innerHTML = '<div class="empty-state">No games found.</div>';
    }
  } catch (error) {
    console.error('Could not load home games.', error);
  }
}

async function loadGames() {
  if (!gamesList || !supabaseClient) {
    return;
  }

  gamesList.replaceChildren();
  setStatus('Loading games...', 'info');

  const { data: games, error } = await supabaseClient
    .from('games')
    .select('id, title, owner_id, visibility, created_at, thumbnail_url')
    .order('created_at', { ascending: false });

  if (error) {
    const message = error.code === '42P01' || error.code === 'PGRST205'
      ? 'Run schema.sql in the Supabase SQL Editor to set up games.'
      : error.message;
    setStatus(message, 'error');
    return;
  }

  if (!games.length) {
    setStatus('No games to show yet.', 'info');
    return;
  }

  setStatus('');

  games.forEach((game) => {
    const item = document.createElement('li');
    item.className = 'game-item';

    const heading = document.createElement('div');
    heading.className = 'game-item-heading';

    const title = document.createElement('h2');
    const titleLink = document.createElement('a');
    titleLink.href = `game.html?id=${encodeURIComponent(game.id)}`;
    titleLink.className = 'game-title-link';
    titleLink.textContent = game.title;
    title.append(titleLink);

    const visibility = document.createElement('span');
    visibility.className = 'game-visibility';
    visibility.textContent = '67';

    const thumbnail = createGameThumbnail(game, 'game-list-thumbnail');
    heading.append(title, visibility);

    item.append(thumbnail, heading);
    gamesList.append(item);
  });
}

async function parseWorldFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.json')) {
    throw new Error('Choose a .json world file.');
  }

  if (file.size > 1024 * 1024) {
    throw new Error('World files must be 1 MB or smaller.');
  }

  let worldData;

  try {
    worldData = JSON.parse(await file.text());
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!worldData || typeof worldData !== 'object' || Array.isArray(worldData)) {
    throw new Error('The world file must contain a JSON object.');
  }

  return worldData;
}

async function uploadGameThumbnail(file, gameId) {
  if (!file) {
    return null;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, WebP, GIF, or AVIF thumbnail.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Thumbnails must be 5 MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'img';
  const path = `${gameId}/thumbnail-${Date.now()}.${extension}`;
  const { error } = await supabaseClient.storage
    .from('game-thumbnails')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    throw error;
  }

  const { data } = supabaseClient.storage.from('game-thumbnails').getPublicUrl(path);
  return data.publicUrl;
}

function renderOwnedGames(games) {
  if (!ownedGamesList || !ownedGamesStatus) {
    return;
  }

  currentOwnedGames = games || [];
  ownedGamesList.replaceChildren();

  if (!currentOwnedGames.length) {
    ownedGamesStatus.textContent = 'You have not created any games yet.';
    return;
  }

  ownedGamesStatus.textContent = `${currentOwnedGames.length} ${currentOwnedGames.length === 1 ? 'game' : 'games'}`;
  currentOwnedGames.forEach((game) => {
    const item = document.createElement('li');
    item.className = 'owned-game-item';

    const thumbnail = document.createElement('div');
    thumbnail.className = 'owned-game-thumbnail';
    if (game.thumbnail_url) {
      const image = document.createElement('img');
      image.src = game.thumbnail_url;
      image.alt = '';
      thumbnail.appendChild(image);
    }

    const details = document.createElement('div');
    details.className = 'owned-game-details';
    const title = document.createElement('h3');
    title.textContent = game.title;
    const visibility = document.createElement('p');
    visibility.textContent = `${game.visibility} · Created ${new Date(game.created_at).toLocaleDateString()}`;
    details.append(title, visibility);

    const actions = document.createElement('div');
    actions.className = 'owned-game-actions';
    const openLink = document.createElement('a');
    openLink.href = `game.html?id=${encodeURIComponent(game.id)}`;
    openLink.textContent = 'Open';
    openLink.className = 'creator-text-button';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'creator-text-button';
    editButton.dataset.editOwnedGame = game.id;
    editButton.textContent = 'Edit';
    actions.append(openLink, editButton);

    item.append(thumbnail, details, actions);
    ownedGamesList.appendChild(item);
  });
}

async function loadOwnedGames() {
  if (!ownedGamesList || !supabaseClient || !currentUser) {
    if (ownedGamesStatus) {
      ownedGamesStatus.textContent = currentUser ? 'Game service is unavailable.' : 'Sign in to manage your games.';
    }
    return;
  }

  ownedGamesStatus.textContent = 'Loading your games...';
  const { data, error } = await supabaseClient
    .from('games')
    .select('id, owner_id, title, visibility, thumbnail_url, created_at')
    .eq('owner_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    ownedGamesStatus.textContent = error.code === '42P01' || error.code === 'PGRST205'
      ? 'Run schema.sql in the Supabase SQL Editor to set up games.'
      : error.message;
    return;
  }

  renderOwnedGames(data || []);
}

async function loadHatUploads() {
  if (!hatUploadAccess || !supabaseClient || !currentUser) {
    if (hatUploadAccess) {
      hatUploadAccess.textContent = 'Sign in required';
      hatUploadDescription.textContent = 'Sign in to check whether hat uploads are enabled for your account.';
    }
    return;
  }

  hatUploadAccess.textContent = 'Checking access';
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('hat_upload_enabled')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (profileError) {
    hatUploadAccess.textContent = 'Unavailable';
    hatUploadDescription.textContent = profileError.code === '42703' || profileError.code === 'PGRST204'
      ? 'Run the latest schema.sql to enable hat-upload permissions.'
      : profileError.message;
    return;
  }

  if (!profile?.hat_upload_enabled) {
    hatUploadAccess.textContent = 'Not enabled';
    hatUploadDescription.textContent = 'Hat uploads are available to accounts enabled by an administrator.';
    hatUploadForm.hidden = true;
    faceUploadForm.hidden = true;
    return;
  }

  hatUploadAccess.textContent = 'Upload enabled';
  hatUploadDescription.textContent = 'Upload a GLB hat model for your account.';
  hatUploadForm.hidden = false;
  faceUploadForm.hidden = false;

  const { data: hats, error: hatsError } = await supabaseClient
    .from('hats')
    .select('id, name, model_url, created_at')
    .eq('uploader_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (hatsError) {
    hatUploadDescription.textContent = hatsError.code === '42P01' || hatsError.code === 'PGRST205'
      ? 'Run the latest schema.sql to set up hat uploads.'
      : hatsError.message;
    return;
  }

  uploadedHatsList.replaceChildren();
  (hats || []).forEach((hat) => {
    const item = document.createElement('li');
    item.className = 'owned-game-item';
    const details = document.createElement('div');
    details.className = 'owned-game-details';
    const title = document.createElement('h3');
    title.textContent = hat.name;
    const date = document.createElement('p');
    date.textContent = `Uploaded ${new Date(hat.created_at).toLocaleDateString()}`;
    details.append(title, date);
    const link = document.createElement('a');
    link.className = 'creator-text-button';
    link.href = hat.model_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View model';
    item.append(details, link);
    uploadedHatsList.appendChild(item);
  });

  const { data: faces, error: facesError } = await supabaseClient
    .from('faces')
    .select('id, name, image_url, created_at')
    .eq('uploader_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (facesError) {
    hatUploadDescription.textContent = facesError.code === '42P01' || facesError.code === 'PGRST205'
      ? 'Run the latest schema.sql to enable face uploads.'
      : facesError.message;
    return;
  }

  uploadedFacesList.replaceChildren();
  (faces || []).forEach((face) => {
    const item = document.createElement('li');
    item.className = 'owned-game-item';
    const image = document.createElement('img');
    image.className = 'face-upload-thumbnail';
    image.src = face.image_url;
    image.alt = '';
    const details = document.createElement('div');
    details.className = 'owned-game-details';
    const title = document.createElement('h3');
    title.textContent = face.name;
    const date = document.createElement('p');
    date.textContent = `Uploaded ${new Date(face.created_at).toLocaleDateString()}`;
    details.append(title, date);
    item.append(image, details);
    uploadedFacesList.appendChild(item);
  });
}

async function loadCatalog() {
  if (!catalogList || !supabaseClient) {
    return;
  }

  catalogList.replaceChildren();
  catalogCount.textContent = 'Loading items';
  setStatus('Loading catalog...', 'info');

  const [
    { data: hats, error: hatsError },
    { data: faces, error: facesError }
  ] = await Promise.all([
    supabaseClient.from('hats').select('id, name, model_url, uploader_id, created_at').order('created_at', { ascending: false }),
    supabaseClient.from('faces').select('id, name, image_url, uploader_id, created_at').order('created_at', { ascending: false })
  ]);

  if (hatsError || facesError) {
    const error = hatsError || facesError;
    catalogCount.textContent = 'Unavailable';
    setStatus(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Run the latest schema.sql to create the catalog.'
      : error.message, 'error');
    return;
  }

  const ownedHatIds = new Set();
  const ownedFaceIds = new Set();
  if (currentUser) {
    const [
      { data: ownedHats, error: hatOwnershipError },
      { data: ownedFaces, error: faceOwnershipError }
    ] = await Promise.all([
      supabaseClient.from('user_hats').select('hat_id').eq('user_id', currentUser.id),
      supabaseClient.from('user_faces').select('face_id').eq('user_id', currentUser.id)
    ]);

    const ownershipError = hatOwnershipError || faceOwnershipError;
    if (ownershipError) {
      catalogCount.textContent = `${hats.length + faces.length} items`;
      setStatus(ownershipError.code === '42P01' || ownershipError.code === 'PGRST205'
        ? 'Run the latest schema.sql to enable collecting hats.'
        : ownershipError.message, 'error');
      return;
    }
    (ownedHats || []).forEach((item) => ownedHatIds.add(item.hat_id));
    (ownedFaces || []).forEach((item) => ownedFaceIds.add(item.face_id));
  }

  const items = [
    ...(hats || []).map((hat) => ({ ...hat, type: 'hat' })),
    ...(faces || []).map((face) => ({ ...face, type: 'face' }))
  ].sort((first, second) => new Date(second.created_at) - new Date(first.created_at));

  catalogCount.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
  if (!items.length) {
    setStatus('No items have been uploaded yet.', 'info');
    return;
  }

  setStatus('');
  items.forEach((catalogItem) => {
    const item = document.createElement('li');
    item.className = 'catalog-item';

    let preview;
    if (catalogItem.type === 'hat') {
      preview = document.createElement('model-viewer');
      preview.className = 'catalog-item-preview';
      preview.src = catalogItem.model_url;
      preview.alt = `${catalogItem.name} 3D preview`;
      preview.setAttribute('camera-controls', '');
      preview.setAttribute('auto-rotate', '');
      preview.setAttribute('rotation-per-second', '18deg');
      preview.setAttribute('loading', 'lazy');
      preview.setAttribute('shadow-intensity', '1');
      preview.setAttribute('camera-orbit', '0deg 75deg 100%');
    } else {
      preview = document.createElement('img');
      preview.className = 'catalog-item-face-preview';
      preview.src = catalogItem.image_url;
      preview.alt = `${catalogItem.name} face`;
    }

    const details = document.createElement('div');
    details.className = 'catalog-item-details';
    const name = document.createElement('h2');
    name.textContent = catalogItem.name;
    const uploaded = document.createElement('p');
    uploaded.textContent = `${catalogItem.type === 'face' ? 'Face' : 'Hat'} · Added ${new Date(catalogItem.created_at).toLocaleDateString()}`;
    details.append(name, uploaded);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'catalog-get-button';
    action.dataset[catalogItem.type === 'face' ? 'getFace' : 'getHat'] = catalogItem.id;
    const isOwned = catalogItem.type === 'face' ? ownedFaceIds.has(catalogItem.id) : ownedHatIds.has(catalogItem.id);
    if (isOwned) {
      action.textContent = 'Owned';
      action.disabled = true;
      action.classList.add('owned');
    } else if (currentUser) {
      action.textContent = catalogItem.type === 'face' ? 'Get face' : 'Get hat';
    } else {
      action.textContent = 'Sign in to get';
      action.disabled = true;
    }

    item.classList.toggle('catalog-item-face', catalogItem.type === 'face');
    item.append(preview, details, action);
    catalogList.appendChild(item);
  });
}

async function claimCatalogHat(button) {
  if (!supabaseClient || !currentUser) {
    setStatus('Sign in to get this hat.', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = 'Adding...';
  const { error } = await supabaseClient.from('user_hats').insert({
    user_id: currentUser.id,
    hat_id: button.dataset.getHat
  });

  if (error && error.code !== '23505') {
    button.disabled = false;
    button.textContent = 'Get hat';
    setStatus(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Run the latest schema.sql to enable collecting hats.'
      : error.message, 'error');
    return;
  }

  setStatus('Hat added to your collection.', 'success');
  await loadCatalog();
}

async function claimCatalogFace(button) {
  if (!supabaseClient || !currentUser) {
    setStatus('Sign in to get this face.', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = 'Adding...';
  const { error } = await supabaseClient.from('user_faces').insert({
    user_id: currentUser.id,
    face_id: button.dataset.getFace
  });

  if (error && error.code !== '23505') {
    button.disabled = false;
    button.textContent = 'Get face';
    setStatus(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Run the latest schema.sql to enable collecting faces.'
      : error.message, 'error');
    return;
  }

  setStatus('Face added to your collection.', 'success');
  await loadCatalog();
}

function editOwnedGame(gameId) {
  const game = currentOwnedGames.find((item) => item.id === gameId);
  if (!game || !manageGameEditForm) {
    return;
  }

  document.getElementById('manageEditGameId').value = game.id;
  document.getElementById('manageEditHeading').textContent = `Edit ${game.title}`;
  document.getElementById('manageEditGameTitle').value = game.title;
  document.getElementById('manageEditVisibility').value = game.visibility;
  manageGameEditForm.hidden = false;
  manageGameEditForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function uploadHatModel(file, name) {
  if (!file || !currentUser || !supabaseClient) {
    throw new Error('Sign in before uploading a hat.');
  }

  if (!/\.glb$/i.test(file.name) || (file.type && file.type !== 'model/gltf-binary' && file.type !== 'application/octet-stream')) {
    throw new Error('Choose a binary GLB model.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Hat models must be 10 MB or smaller.');
  }

  const path = `${currentUser.id}/${crypto.randomUUID()}.glb`;
  const { error: uploadError } = await supabaseClient.storage
    .from('hats')
    .upload(path, file, { contentType: 'model/gltf-binary', upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrl } = supabaseClient.storage.from('hats').getPublicUrl(path);
  const { error: insertError } = await supabaseClient.from('hats').insert({
    uploader_id: currentUser.id,
    name,
    model_path: path,
    model_url: publicUrl.publicUrl
  });

  if (insertError) {
    await supabaseClient.storage.from('hats').remove([path]);
    throw insertError;
  }
}

async function uploadFaceImage(file, name) {
  if (!file || !currentUser || !supabaseClient) {
    throw new Error('Sign in before uploading a face.');
  }
  if (file.type !== 'image/png' || !/\.png$/i.test(file.name)) {
    throw new Error('Choose a PNG face image.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Face images must be 2 MB or smaller.');
  }

  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (signature.some((byte, index) => byte !== [137, 80, 78, 71, 13, 10, 26, 10][index])) {
    throw new Error('The selected file is not a valid PNG image.');
  }

  const path = `${currentUser.id}/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabaseClient.storage
    .from('faces')
    .upload(path, file, { contentType: 'image/png', upsert: false });
  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrl } = supabaseClient.storage.from('faces').getPublicUrl(path);
  const { error: insertError } = await supabaseClient.from('faces').insert({
    uploader_id: currentUser.id,
    name,
    image_path: path,
    image_url: publicUrl.publicUrl
  });
  if (insertError) {
    await supabaseClient.storage.from('faces').remove([path]);
    throw insertError;
  }
}

async function loadGameDetail() {
  if (!gameDetail || !supabaseClient) {
    return;
  }

  const query = new URLSearchParams(window.location.search);
  const gameId = query.get('id');

  if (!gameId) {
    setStatus('Choose a game from the Games page.', 'error');
    return;
  }

  setStatus('Loading game...', 'info');

  const { data, error } = await supabaseClient
    .from('games')
    .select('id, title, owner_id, visibility, created_at, thumbnail_url')
    .eq('id', gameId)
    .maybeSingle();

  if (error) {
    const message = error.code === '42P01' || error.code === 'PGRST205'
      ? 'Run schema.sql in the Supabase SQL Editor to set up games.'
      : error.message;
    setStatus(message, 'error');
    return;
  }

  if (!data) {
    setStatus('This game does not exist or is private.', 'error');
    return;
  }

  currentGame = data;
  if (currentUser?.id) {
    const { error: recentPlayError } = await supabaseClient
      .from('recently_played')
      .upsert({
        user_id: currentUser.id,
        game_id: data.id,
        last_played_at: new Date().toISOString()
      }, { onConflict: 'user_id,game_id' });

    if (recentPlayError) {
      console.error('Could not record recently played game:', recentPlayError);
    }
  }

  const isOwner = currentUser?.id === data.owner_id;
  gameTitleDisplay.textContent = data.title;
  gameVisibilityDisplay.textContent = isOwner ? data.visibility : 'public';
  document.getElementById('playGameButton').href = `cubit://${encodeURIComponent(data.id)}`;
  const thumbnailDisplay = document.getElementById('gameThumbnailDisplay');
  if (thumbnailDisplay) {
    thumbnailDisplay.hidden = !data.thumbnail_url;
    thumbnailDisplay.replaceChildren();
    if (data.thumbnail_url) {
      const image = document.createElement('img');
      image.src = data.thumbnail_url;
      image.alt = `${data.title} thumbnail`;
      thumbnailDisplay.appendChild(image);
    }
  }
  editGameButton.hidden = !isOwner;
  if (deleteGameButton) {
    deleteGameButton.hidden = !isOwner;
  }
  gameDetail.hidden = false;
  document.title = `${data.title} - Cubit`;
  setStatus('');
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveTab(button.dataset.tab);
    setStatus('');
  });
});

document.querySelectorAll('.creator-tab').forEach((tab) => {
  tab.addEventListener('click', (event) => {
    const selectedTab = event.currentTarget;
    document.querySelectorAll('.creator-tab').forEach((candidate) => {
      const active = candidate === selectedTab;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.creator-panel').forEach((panel) => {
      panel.hidden = panel.id !== selectedTab.dataset.creatorTab;
      panel.classList.toggle('active', !panel.hidden);
    });

    if (selectedTab.dataset.creatorTab === 'manageGamesPanel') {
      loadOwnedGames();
    } else if (selectedTab.dataset.creatorTab === 'uploadHatsPanel') {
      loadHatUploads();
    }
  });
});

document.getElementById('refreshOwnedGames')?.addEventListener('click', loadOwnedGames);

ownedGamesList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit-owned-game]');
  if (button) {
    editOwnedGame(button.dataset.editOwnedGame);
  }
});

catalogList?.addEventListener('click', (event) => {
  const faceButton = event.target.closest('[data-get-face]');
  const hatButton = event.target.closest('[data-get-hat]');
  if (faceButton) {
    claimCatalogFace(faceButton);
  } else if (hatButton) {
    claimCatalogHat(hatButton);
  }
});

document.getElementById('cancelManageGameEdit')?.addEventListener('click', () => {
  manageGameEditForm.reset();
  manageGameEditForm.hidden = true;
  setStatus('');
});

manageGameEditForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const gameId = document.getElementById('manageEditGameId').value;
  const game = currentOwnedGames.find((item) => item.id === gameId);
  if (!supabaseClient || !currentUser || !game || game.owner_id !== currentUser.id) {
    setStatus('Only the game owner can edit this game.', 'error');
    return;
  }

  const title = document.getElementById('manageEditGameTitle').value.trim();
  const worldFile = document.getElementById('manageEditWorldFile').files[0];
  const thumbnailFile = document.getElementById('manageEditThumbnail').files[0];
  const updates = {
    title,
    visibility: document.getElementById('manageEditVisibility').value
  };

  if (!title) {
    setStatus('Enter a name for your game.', 'error');
    return;
  }

  try {
    if (worldFile) {
      updates.world_data = await parseWorldFile(worldFile);
    }
    if (thumbnailFile) {
      updates.thumbnail_url = await uploadGameThumbnail(thumbnailFile, game.id);
    }

    const { error } = await supabaseClient.from('games').update(updates).eq('id', game.id);
    if (error) {
      setStatus(error.message, 'error');
      return;
    }

    setStatus('Game updated.', 'success');
    manageGameEditForm.reset();
    manageGameEditForm.hidden = true;
    await loadOwnedGames();
  } catch (error) {
    setStatus(error.message || 'Could not update this game.', 'error');
  }
});

hatUploadForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('hatName').value.trim();
  const file = document.getElementById('hatModelFile').files[0];
  if (!name) {
    setStatus('Enter a name for this hat.', 'error');
    return;
  }

  try {
    await uploadHatModel(file, name);
    setStatus('Hat uploaded.', 'success');
    hatUploadForm.reset();
    await loadHatUploads();
  } catch (error) {
    setStatus(error.message || 'Could not upload this hat.', 'error');
  }
});

faceUploadForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('faceName').value.trim();
  const file = document.getElementById('faceImageFile').files[0];
  if (!name) {
    setStatus('Enter a name for this face.', 'error');
    return;
  }

  try {
    await uploadFaceImage(file, name);
    setStatus('Face uploaded to Catalog.', 'success');
    faceUploadForm.reset();
    await loadHatUploads();
  } catch (error) {
    setStatus(error.message || 'Could not upload this face.', 'error');
  }
});

gameCreateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!supabaseClient || !currentUser) {
    setStatus('Sign in to create a game.', 'error');
    return;
  }

  const title = document.getElementById('gameTitle').value.trim();
  const worldFile = document.getElementById('worldFile').files[0];
  const thumbnailFile = document.getElementById('gameThumbnail').files[0];
  const visibility = document.getElementById('gameVisibility').value;

  if (!title) {
    setStatus('Enter a name for your game.', 'error');
    return;
  }

  try {
    const worldData = await parseWorldFile(worldFile);

    const { data: game, error } = await supabaseClient.from('games').insert({
      owner_id: currentUser.id,
      title,
      visibility,
      world_data: worldData
    }).select('id').single();

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        setStatus('Run schema.sql in the Supabase SQL Editor before creating games.', 'error');
      } else {
        setStatus(error.message, 'error');
      }
      return;
    }

    if (thumbnailFile) {
      const thumbnailUrl = await uploadGameThumbnail(thumbnailFile, game.id);
      const { error: thumbnailError } = await supabaseClient
        .from('games')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', game.id);

      if (thumbnailError) {
        setStatus(`Game created, but the thumbnail could not be saved: ${thumbnailError.message}`, 'error');
        return;
      }
    }

    setStatus(`Game created as ${visibility}.`, 'success');
    gameCreateForm.reset();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

editGameButton?.addEventListener('click', () => {
  if (!currentGame || currentGame.owner_id !== currentUser?.id) {
    return;
  }

  document.getElementById('editGameTitle').value = currentGame.title;
  document.getElementById('editGameVisibility').value = currentGame.visibility;
  gameOverview.hidden = true;
  gameEditForm.hidden = false;
  editGameButton.hidden = true;
});

deleteGameButton?.addEventListener('click', async () => {
  if (!supabaseClient || !currentUser || currentGame?.owner_id !== currentUser.id) {
    setStatus('Only the game owner can delete this game.', 'error');
    return;
  }

  if (!window.confirm(`Delete "${currentGame.title}"? This cannot be undone.`)) {
    return;
  }

  deleteGameButton.disabled = true;
  setStatus('Deleting game...', 'info');

  try {
    const { error } = await supabaseClient
      .from('games')
      .delete()
      .eq('id', currentGame.id);

    if (error) {
      setStatus(error.message, 'error');
      deleteGameButton.disabled = false;
      return;
    }

    window.location.href = 'games.html';
  } catch (error) {
    setStatus(error.message || 'Could not delete this game.', 'error');
    deleteGameButton.disabled = false;
  }
});

cancelEditButton?.addEventListener('click', () => {
  gameEditForm.reset();
  gameEditForm.hidden = true;
  gameOverview.hidden = false;
  editGameButton.hidden = false;
  setStatus('');
});

gameEditForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!supabaseClient || !currentUser || currentGame?.owner_id !== currentUser.id) {
    setStatus('Only the game owner can edit this game.', 'error');
    return;
  }

  const title = document.getElementById('editGameTitle').value.trim();
  const worldFile = document.getElementById('editWorldFile').files[0];
  const thumbnailFile = document.getElementById('editThumbnailFile').files[0];
  const visibility = document.getElementById('editGameVisibility').value;

  if (!title) {
    setStatus('Enter a name for your game.', 'error');
    return;
  }

  const updates = { title, visibility };

  try {
    if (worldFile) {
      updates.world_data = await parseWorldFile(worldFile);
    }

    if (thumbnailFile) {
      updates.thumbnail_url = await uploadGameThumbnail(thumbnailFile, currentGame.id);
    }

    const { error } = await supabaseClient
      .from('games')
      .update(updates)
      .eq('id', currentGame.id);

    if (error) {
      setStatus(error.message, 'error');
      return;
    }

    currentGame = { ...currentGame, ...updates };
    gameTitleDisplay.textContent = currentGame.title;
    gameVisibilityDisplay.textContent = currentGame.visibility;
    const thumbnailDisplay = document.getElementById('gameThumbnailDisplay');
    if (thumbnailDisplay) {
      thumbnailDisplay.hidden = !currentGame.thumbnail_url;
    }
    if (thumbnailDisplay && currentGame.thumbnail_url) {
      const image = document.createElement('img');
      image.src = currentGame.thumbnail_url;
      image.alt = `${currentGame.title} thumbnail`;
      thumbnailDisplay.replaceChildren(image);
    }
    document.title = `${currentGame.title} - Cubit`;
    gameEditForm.reset();
    gameEditForm.hidden = true;
    gameOverview.hidden = false;
    editGameButton.hidden = false;
    setStatus('Game updated.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

signInForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    setStatus('Add your Supabase URL and anon key in app.js to enable auth.', 'info');
    return;
  }

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  if (!email || !password) {
    setStatus('Please enter both your email and password.', 'error');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message, 'error');
      return;
    }

    setStatus('Signed in successfully.', 'success');
    setActiveTab('signin');
    updateAuthUI(data.session);
    signInForm.reset();
  } catch (error) {
    setStatus(error.message || 'Unable to sign in right now.', 'error');
  }
});

signUpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    setStatus('Add your Supabase URL and anon key in app.js to enable auth.', 'info');
    return;
  }

  const username = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!username || !email || !password) {
    setStatus('Please fill in your username, email, and password.', 'error');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (error) {
      setStatus(error.message, 'error');
      return;
    }

    if (data?.session) {
      setStatus('Account created and signed in.', 'success');
      updateAuthUI(data.session);
    } else {
      setStatus('Account created. Check your email to confirm your account.', 'success');
    }

    signUpForm.reset();
  } catch (error) {
    setStatus(error.message || 'Unable to create the account.', 'error');
  }
});

signOutBtn?.addEventListener('click', async () => {
  if (!supabaseClient) {
    setStatus('Add your Supabase URL and anon key in app.js to enable auth.', 'info');
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      setStatus(error.message, 'error');
      return;
    }

    setStatus('You have been signed out.', 'info');
    updateAuthUI(null);
    updateHomeUser(null);
    setActiveTab('signin');
  } catch (error) {
    setStatus(error.message || 'Sign out failed.', 'error');
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  if (!supabaseClient) {
    return;
  }

  try {
    await supabaseClient.auth.signOut();
    updateHomeUser(null);
  } catch (error) {
    console.error('Home logout failed.', error);
  }
});

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.page;
    if (!target) {
      return;
    }

    navigateHomeRoute(target);
  });
});

document.querySelector('.welcome-icon')?.addEventListener('click', () => {
  if (currentUser?.id) {
    navigateHomeRoute(`profile/${encodeURIComponent(currentUser.id)}`);
  }
});

window.addEventListener('hashchange', () => {
  if (document.getElementById('homeShell')) {
    handleHomeRoute();
  }
});

document.querySelector('.menu-toggle')?.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) {
    return;
  }

  sidebar.classList.toggle('collapsed');
  const expanded = !sidebar.classList.contains('collapsed');
  document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', String(expanded));
});

document.addEventListener('DOMContentLoaded', async () => {
  if (!supabaseClient) {
    return;
  }

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error('Session error:', error);
    }

    updateAuthUI(session);
    updateHomeUser(session);

    if (document.getElementById('homeShell')) {
      const requestedPage = window.location.hash.slice(1);
      if (requestedPage === 'games') {
        window.location.replace('games.html');
        return;
      }
      handleHomeRoute();
      await loadHomeGames();
      await loadUsers();
    }

    if (gamesList) {
      await loadGames();
    }

    if (gameDetail) {
      await loadGameDetail();
    }

    if (catalogList) {
      await loadCatalog();
    }

    if (session && signInForm) {
      setStatus('You are already signed in.', 'success');
    }
  } catch (error) {
    console.error('Could not initialize Supabase auth.', error);
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
    updateHomeUser(session);

    if (document.getElementById('homeShell') && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
      loadHomeGames();
      loadUsers();
    }

    if (gamesList && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
      loadGames();
    }

    if (gameDetail && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
      loadGameDetail();
    }

    if (catalogList && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
      loadCatalog();
    }

    if (event === 'SIGNED_OUT') {
      setStatus('Signed out successfully.', 'info');
    }
  });
});
