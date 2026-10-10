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
let currentUser = null;
let currentGame = null;

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
    const row = document.createElement('div');
    row.className = 'user-row';

    const avatar = document.createElement('span');
    avatar.className = 'mini-avatar';

    const name = document.createElement('span');
    name.textContent = user.username || user.email || 'User';

    row.append(avatar, name);
    container.appendChild(row);
  });
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

    if (target === 'users') {
      loadUsers();
    }

    if (target === 'games') {
      setActiveNavPage('games');
      return;
    }

    setActiveNavPage(target);
  });
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

    if (document.body.classList.contains('home-page')) {
      const requestedPage = window.location.hash.slice(1);
      if (requestedPage === 'games') {
        window.location.replace('games.html');
        return;
      }
      if (['home', 'users'].includes(requestedPage)) {
        setActiveNavPage(requestedPage);
      }
      await loadHomeGames();
      await loadUsers();
    }

    if (gamesList) {
      await loadGames();
    }

    if (gameDetail) {
      await loadGameDetail();
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

    if (document.body.classList.contains('home-page') && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
      loadHomeGames();
      loadUsers();
    }

    if (gamesList && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
      loadGames();
    }

    if (gameDetail && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
      loadGameDetail();
    }

    if (event === 'SIGNED_OUT') {
      setStatus('Signed out successfully.', 'info');
    }
  });
});
