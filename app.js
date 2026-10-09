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
const cancelEditButton = document.getElementById('cancelEditButton');
const gameTitleDisplay = document.getElementById('gameTitleDisplay');
const gameVisibilityDisplay = document.getElementById('gameVisibilityDisplay');
const worldView = document.getElementById('worldView');
const worldPreview = document.getElementById('worldPreview');
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
  } else if (signInForm && signUpForm) {
    setActiveTab('signin');
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
    .select('id, title, owner_id, visibility, created_at')
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
    visibility.textContent = game.owner_id === currentUser?.id
      ? game.visibility
      : 'public';

    heading.append(title, visibility);

    item.append(heading);
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

async function loadGameDetail() {
  if (!gameDetail || !supabaseClient) {
    return;
  }

  const query = new URLSearchParams(window.location.search.replace('?apijson', '&apijson'));
  const gameId = query.get('id');

  if (!gameId) {
    setStatus('Choose a game from the Games page.', 'error');
    return;
  }

  setStatus('Loading game...', 'info');

  const { data, error } = await supabaseClient
    .from('games')
    .select('id, title, owner_id, visibility, created_at, world_data')
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
  if (query.has('apijson')) {
    const jsonOutput = document.createElement('pre');
    jsonOutput.textContent = JSON.stringify(data.world_data, null, 2);
    document.body.replaceChildren(jsonOutput);
    document.body.style.cssText = 'margin: 8px; background: #fff; color: #000; font: 13px monospace;';
    document.title = `${data.title} - Cubit JSON`;
    return;
  }

  const isOwner = currentUser?.id === data.owner_id;
  gameTitleDisplay.textContent = data.title;
  gameVisibilityDisplay.textContent = isOwner ? data.visibility : 'public';
  worldPreview.textContent = JSON.stringify(data.world_data, null, 2);
  editGameButton.hidden = !isOwner;
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
  const visibility = document.getElementById('gameVisibility').value;

  if (!title) {
    setStatus('Enter a name for your game.', 'error');
    return;
  }

  try {
    const worldData = await parseWorldFile(worldFile);

    const { error } = await supabaseClient.from('games').insert({
      owner_id: currentUser.id,
      title,
      visibility,
      world_data: worldData
    });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        setStatus('Run schema.sql in the Supabase SQL Editor before creating games.', 'error');
      } else {
        setStatus(error.message, 'error');
      }
      return;
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
  worldView.hidden = true;
  gameEditForm.hidden = false;
  editGameButton.hidden = true;
});

cancelEditButton?.addEventListener('click', () => {
  gameEditForm.reset();
  gameEditForm.hidden = true;
  worldView.hidden = false;
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
    worldPreview.textContent = JSON.stringify(currentGame.world_data, null, 2);
    document.title = `${currentGame.title} - Cubit`;
    gameEditForm.reset();
    gameEditForm.hidden = true;
    worldView.hidden = false;
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
    setActiveTab('signin');
  } catch (error) {
    setStatus(error.message || 'Sign out failed.', 'error');
  }
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
