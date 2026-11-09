const friendsClient = window.cubitSupabaseClient;
const friendsPageStatus = document.getElementById('friendsPageStatus');
const userSearchForm = document.getElementById('userSearchForm');
const userSearchInput = document.getElementById('userSearchInput');
const userSearchResults = document.getElementById('userSearchResults');
const incomingFriendRequests = document.getElementById('incomingFriendRequests');
const yourFriendsList = document.getElementById('yourFriendsList');
let signedInUserId = null;
let userRelationships = [];
let relationshipProfiles = new Map();

function setFriendsStatus(message, type = 'info') {
  friendsPageStatus.textContent = message;
  friendsPageStatus.className = `status-message ${type}`;
}

function renderEmptyMessage(container, message) {
  container.replaceChildren();
  const empty = document.createElement('p');
  empty.className = 'friends-empty';
  empty.textContent = message;
  container.appendChild(empty);
}

function setFriendSearchEnabled(enabled) {
  userSearchInput.disabled = !enabled;
  userSearchForm.querySelector('button').disabled = !enabled;
}

function createFriendIdentity(profile) {
  const identity = document.createElement('a');
  identity.className = 'friend-identity';
  identity.href = `index.html#profile/${encodeURIComponent(profile.id)}`;

  const avatar = document.createElement('span');
  avatar.className = 'friend-avatar';
  avatar.setAttribute('aria-hidden', 'true');

  if (profile.avatar_url) {
    const image = document.createElement('img');
    image.src = profile.avatar_url;
    image.alt = '';
    avatar.appendChild(image);
  } else {
    avatar.textContent = (profile.username || '?').slice(0, 1).toUpperCase();
  }

  const username = document.createElement('span');
  username.className = 'friend-username';
  username.textContent = profile.username || 'User';
  identity.append(avatar, username);
  return identity;
}

function createFriendRow(profile) {
  const row = document.createElement('article');
  row.className = 'friend-row';
  row.appendChild(createFriendIdentity(profile));
  return row;
}

function getRelationshipFor(profileId) {
  return userRelationships.find((relationship) =>
    relationship.requester_id === profileId || relationship.addressee_id === profileId
  );
}

function createRelationshipAction(profile, relationship) {
  if (relationship?.status === 'accepted') {
    const label = document.createElement('span');
    label.className = 'friend-state';
    label.textContent = 'Friends';
    return label;
  }

  if (relationship?.status === 'pending') {
    if (relationship.addressee_id === signedInUserId) {
      const acceptButton = document.createElement('button');
      acceptButton.className = 'friends-action';
      acceptButton.type = 'button';
      acceptButton.textContent = 'Accept';
      acceptButton.addEventListener('click', () => acceptFriendRequest(relationship.id));
      return acceptButton;
    }

    const label = document.createElement('span');
    label.className = 'friend-state';
    label.textContent = 'Request sent';
    return label;
  }

  const requestButton = document.createElement('button');
  requestButton.className = 'friends-action';
  requestButton.type = 'button';
  requestButton.textContent = 'Add friend';
  requestButton.addEventListener('click', () => sendFriendRequest(profile));
  return requestButton;
}

function renderSearchResults(profiles) {
  userSearchResults.replaceChildren();
  if (!profiles.length) {
    renderEmptyMessage(userSearchResults, 'No users found.');
    return;
  }

  profiles.forEach((profile) => {
    const row = createFriendRow(profile);
    row.appendChild(createRelationshipAction(profile, getRelationshipFor(profile.id)));
    userSearchResults.appendChild(row);
  });
}

function renderFriendSections() {
  const incoming = userRelationships.filter((relationship) =>
    relationship.status === 'pending' && relationship.addressee_id === signedInUserId
  );
  const friends = userRelationships.filter((relationship) => relationship.status === 'accepted');

  incomingFriendRequests.replaceChildren();
  if (incoming.length) {
    incoming.forEach((relationship) => {
      const profile = relationshipProfiles.get(relationship.requester_id);
      if (!profile) return;
      const row = createFriendRow(profile);
      row.appendChild(createRelationshipAction(profile, relationship));
      incomingFriendRequests.appendChild(row);
    });
  } else {
    renderEmptyMessage(incomingFriendRequests, 'No friend requests.');
  }

  yourFriendsList.replaceChildren();
  if (friends.length) {
    friends.forEach((relationship) => {
      const friendId = relationship.requester_id === signedInUserId
        ? relationship.addressee_id
        : relationship.requester_id;
      const profile = relationshipProfiles.get(friendId);
      if (profile) yourFriendsList.appendChild(createFriendRow(profile));
    });
  } else {
    renderEmptyMessage(yourFriendsList, 'Your friends will appear here.');
  }
}

async function loadFriendRelationships() {
  const { data: relationships, error } = await friendsClient
    .from('friend_requests')
    .select('id, requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${signedInUserId},addressee_id.eq.${signedInUserId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  userRelationships = relationships || [];

  const otherUserIds = [...new Set(userRelationships.map((relationship) =>
    relationship.requester_id === signedInUserId
      ? relationship.addressee_id
      : relationship.requester_id
  ))];

  if (!otherUserIds.length) {
    relationshipProfiles = new Map();
    renderFriendSections();
    return;
  }

  const { data: profiles, error: profilesError } = await friendsClient
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', otherUserIds);

  if (profilesError) throw profilesError;
  relationshipProfiles = new Map((profiles || []).map((profile) => [profile.id, profile]));
  renderFriendSections();
}

async function sendFriendRequest(profile) {
  const { error } = await friendsClient.from('friend_requests').insert({
    requester_id: signedInUserId,
    addressee_id: profile.id
  });

  if (error) {
    setFriendsStatus(error.code === '23505'
      ? 'A request or friendship already exists with this user.'
      : 'Could not send this friend request.', 'error');
    return;
  }

  setFriendsStatus(`Friend request sent to ${profile.username}.`, 'success');
  await loadFriendRelationships();
  renderSearchResultsFromInput();
}

async function acceptFriendRequest(requestId) {
  const { data, error } = await friendsClient
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    setFriendsStatus('Could not accept this request. Refresh and try again.', 'error');
    return;
  }

  setFriendsStatus('Friend request accepted.', 'success');
  await loadFriendRelationships();
  renderSearchResultsFromInput();
}

async function renderSearchResultsFromInput() {
  const query = userSearchInput.value.trim();
  if (!query) return;

  const { data: profiles, error } = await friendsClient
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', signedInUserId)
    .order('username')
    .limit(30);

  if (error) {
    setFriendsStatus('Could not search users right now.', 'error');
    return;
  }

  renderSearchResults(profiles || []);
}

userSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = userSearchInput.value.trim();
  if (!query) return;

  userSearchResults.setAttribute('aria-busy', 'true');
  await renderSearchResultsFromInput();
  userSearchResults.removeAttribute('aria-busy');
});

document.addEventListener('DOMContentLoaded', async () => {
  if (!friendsClient) {
    setFriendsStatus('Supabase is not configured.');
    return;
  }

  const { data: { session }, error } = await friendsClient.auth.getSession();
  if (error) {
    setFriendsStatus('Could not verify your session. Refresh and try again.', 'error');
    return;
  }

  signedInUserId = session?.user?.id || null;
  if (!signedInUserId) {
    setFriendSearchEnabled(false);
    setFriendsStatus('Sign in to search users and manage friend requests.');
    renderEmptyMessage(incomingFriendRequests, 'Sign in to view friend requests.');
    renderEmptyMessage(yourFriendsList, 'Sign in to view your friends.');
    return;
  }

  try {
    await loadFriendRelationships();
  } catch (loadError) {
    console.error('Could not load friend relationships.', loadError);
    const message = loadError.code === '42P01' || loadError.code === 'PGRST205'
      ? 'Run schema.sql in the Supabase SQL Editor to enable friend requests.'
      : 'Could not load friend requests. Please try again later.';
    setFriendsStatus(message, 'error');
  }

  friendsClient.auth.onAuthStateChange((event, nextSession) => {
    if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
    signedInUserId = nextSession?.user?.id || null;
    if (signedInUserId) {
      setFriendSearchEnabled(true);
      loadFriendRelationships().catch((loadError) => {
        console.error('Could not refresh friend relationships.', loadError);
        setFriendsStatus('Could not load friend requests. Please try again later.', 'error');
      });
    } else {
      setFriendSearchEnabled(false);
      userRelationships = [];
      relationshipProfiles = new Map();
      renderEmptyMessage(incomingFriendRequests, 'Sign in to view friend requests.');
      renderEmptyMessage(yourFriendsList, 'Sign in to view your friends.');
      renderEmptyMessage(userSearchResults, 'Sign in to search for users.');
      setFriendsStatus('Sign in to search users and manage friend requests.');
    }
  });
});