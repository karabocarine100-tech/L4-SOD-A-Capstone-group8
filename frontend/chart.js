const socket = io();

// ── DOM refs ──
const joinScreen    = document.getElementById('joinScreen');
const chatScreen    = document.getElementById('chatScreen');
const joinBtn       = document.getElementById('joinBtn');
const leaveBtn      = document.getElementById('leaveBtn');
const messageForm   = document.getElementById('messageForm');
const messageInput  = document.getElementById('messageInput');
const messagesDiv   = document.getElementById('messages');
const userList      = document.getElementById('userList');
const typingDiv     = document.getElementById('typingIndicator');
const currentRoom   = document.getElementById('currentRoom');
const headerRoom    = document.getElementById('headerRoom');
const onlineCount   = document.getElementById('onlineCount');
const joinAvatar    = document.getElementById('joinAvatar');

// Profile
const profileModal    = document.getElementById('profileModal');
const openProfile     = document.getElementById('openProfile');
const closeProfile    = document.getElementById('closeProfile');
const profileAvatar   = document.getElementById('profileAvatar');
const avatarOverlay   = document.getElementById('avatarOverlay');
const avatarInput     = document.getElementById('avatarInput');
const profileUsername = document.getElementById('profileUsername');
const profileBio      = document.getElementById('profileBio');
const editProfileBtn  = document.getElementById('editProfileBtn');
const saveProfileBtn  = document.getElementById('saveProfileBtn');
const progressFill    = document.getElementById('progressFill');
const progressPct     = document.getElementById('progressPct');
const sidebarAvatar   = document.getElementById('sidebarAvatar');
const sidebarUsername = document.getElementById('sidebarUsername');
const sidebarBio      = document.getElementById('sidebarBio');

// Search
const searchModal   = document.getElementById('searchModal');
const openSearch    = document.getElementById('openSearch');
const closeSearch   = document.getElementById('closeSearch');
const searchInput   = document.getElementById('searchInput');
const searchBtn     = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

// Emoji
const emojiToggle = document.getElementById('emojiToggle');
const emojiWrap   = document.getElementById('emojiWrap');
const emojiPicker = document.getElementById('emojiPicker');

// ── State ──
let myUsername = '';
let myRoom = '';
let myAvatar = '';
let typingTimeout;
const typingUsers = new Set();
let pendingAvatarUrl = '';

// ── Theme Toggle ──
const THEME_KEY = 'chatapp-theme';

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light');
    document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = '☀️');
  } else {
    document.body.classList.remove('light');
    document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = '🌙');
  }
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
}

// Apply saved theme on load
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

document.getElementById('themeToggleJoin').addEventListener('click', toggleTheme);
document.getElementById('themeToggleChat').addEventListener('click', toggleTheme);

// ── Update join avatar preview as user types ──
document.getElementById('usernameInput').addEventListener('input', (e) => {
  const val = e.target.value.trim() || 'U';
  joinAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(val)}&background=7c6fcd&color=fff&size=80`;
});

// ── Join Room ──
joinBtn.addEventListener('click', async () => {
  const username = document.getElementById('usernameInput').value.trim();
  const room     = document.getElementById('roomSelect').value;
  if (!username) { alert('Please enter a username.'); return; }

  myUsername = username;
  myRoom     = room;

  // Load or create profile
  await loadProfile(username);

  socket.emit('joinRoom', { username, room });

  currentRoom.textContent = room;
  headerRoom.textContent  = room;
  sidebarUsername.textContent = username;

  joinScreen.style.display = 'none';
  chatScreen.style.display = 'flex';
  messageInput.focus();

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

document.getElementById('usernameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});

// ── Leave ──
leaveBtn.addEventListener('click', () => location.reload());

// ── Send Message ──
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  socket.emit('chatMessage', msg);
  messageInput.value = '';
  socket.emit('stopTyping');
  clearTimeout(typingTimeout);
  emojiWrap.style.display = 'none';
});

// ── Typing ──
messageInput.addEventListener('input', () => {
  socket.emit('typing');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('stopTyping'), 1500);
});

// ── Emoji Picker ──
emojiToggle.addEventListener('click', () => {
  emojiWrap.style.display = emojiWrap.style.display === 'none' ? 'block' : 'none';
});

emojiPicker.addEventListener('emoji-click', (e) => {
  messageInput.value += e.detail.unicode;
  messageInput.focus();
});

// Close emoji on outside click
document.addEventListener('click', (e) => {
  if (!emojiWrap.contains(e.target) && e.target !== emojiToggle) {
    emojiWrap.style.display = 'none';
  }
});

// ── Mark messages seen when user focuses window ──
window.addEventListener('focus', () => {
  if (myRoom) socket.emit('markSeen', { room: myRoom });
});

// ── Socket Events ──

socket.on('messageHistory', (messages) => {
  messagesDiv.innerHTML = '';
  if (messages.length > 0) {
    appendDivider('── Chat History ──');
    messages.forEach(({ id, username, message, timestamp, status }) => {
      appendMessage(id, username, message, timestamp, status);
    });
    appendDivider('── Live ──');
  }
  scrollToBottom();
});

socket.on('chatMessage', ({ id, username, message, timestamp, status }) => {
  appendMessage(id, username, message, timestamp, status);
  scrollToBottom();

  // Show in-app banner if window not focused
  if (document.hidden && username !== myUsername) {
    showBanner(username, message);
    sendBrowserNotification(username, message);
  }
});

socket.on('messageStatus', ({ id, status }) => {
  updateReceiptUI(id, status);
});

socket.on('messagesSeen', ({ by }) => {
  // Update all own messages to 'seen'
  document.querySelectorAll('.msg.own[data-id]').forEach((el) => {
    updateReceiptUI(el.dataset.id, 'seen');
  });
});

socket.on('notification', ({ message, timestamp }) => {
  appendDivider(`${message} • ${timestamp}`);
  scrollToBottom();
});

socket.on('roomUsers', (users) => {
  userList.innerHTML = users.map(u => `<li>${escapeHtml(u)}</li>`).join('');
  onlineCount.textContent = `${users.length} online`;
});

socket.on('typing', ({ username }) => {
  typingUsers.add(username);
  updateTypingDisplay();
});

socket.on('stopTyping', ({ username }) => {
  typingUsers.delete(username);
  updateTypingDisplay();
});

socket.on('searchResults', (results) => {
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="no-results">No messages found</div>';
    return;
  }
  searchResults.innerHTML = results.map(r => `
    <div class="search-result-item">
      <div class="s-name">${escapeHtml(r.username)}</div>
      <div class="s-msg">${escapeHtml(r.message)}</div>
      <div class="s-time">${r.timestamp}</div>
    </div>
  `).join('');
});

// ── Profile ──
async function loadProfile(username) {
  try {
    const res  = await fetch(`/api/profile/${encodeURIComponent(username)}`);
    const data = await res.json();
    applyProfile(data);
  } catch (e) {
    console.error('Profile load error:', e);
  }
}

function applyProfile(data) {
  const avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username)}&background=7c6fcd&color=fff&size=100`;
  myAvatar = avatarUrl;
  profileAvatar.src   = avatarUrl;
  sidebarAvatar.src   = avatarUrl;
  profileUsername.value = data.username;
  profileBio.value      = data.bio || '';
  sidebarBio.textContent = data.bio || 'No bio yet';
  updateProgress(data);
}

function updateProgress(data) {
  let score = 0;
  if (data.username) score += 50;
  if (data.bio)      score += 25;
  if (data.avatar)   score += 25;
  progressFill.style.width = score + '%';
  progressPct.textContent  = score + '%';
}

openProfile.addEventListener('click', () => profileModal.classList.add('open'));
closeProfile.addEventListener('click', () => {
  profileModal.classList.remove('open');
  setProfileEditing(false);
});

editProfileBtn.addEventListener('click', () => setProfileEditing(true));

saveProfileBtn.addEventListener('click', async () => {
  const bio    = profileBio.value.trim();
  const avatar = pendingAvatarUrl || myAvatar;

  try {
    const res  = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: myUsername, bio, avatar }),
    });
    const data = await res.json();
    applyProfile(data);
    pendingAvatarUrl = '';
    setProfileEditing(false);
  } catch (e) {
    console.error('Save profile error:', e);
  }
});

function setProfileEditing(on) {
  profileBio.disabled = !on;
  editProfileBtn.style.display = on ? 'none'  : 'block';
  saveProfileBtn.style.display = on ? 'block' : 'none';
}

// Avatar upload
avatarOverlay.addEventListener('click', () => avatarInput.click());
avatarInput.addEventListener('change', async () => {
  const file = avatarInput.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('avatar', file);
  try {
    const res  = await fetch('/api/upload-avatar', { method: 'POST', body: form });
    const data = await res.json();
    pendingAvatarUrl  = data.url;
    profileAvatar.src = data.url;
    setProfileEditing(true);
  } catch (e) {
    console.error('Upload error:', e);
  }
});

// ── Search ──
openSearch.addEventListener('click', () => searchModal.classList.add('open'));
closeSearch.addEventListener('click', () => searchModal.classList.remove('open'));

searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (!q) return;
  socket.emit('searchMessages', { room: myRoom, query: q });
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

// ── Helpers ──
function appendMessage(id, username, message, timestamp, status) {
  const isOwn = username === myUsername;
  const div   = document.createElement('div');
  div.classList.add('msg', isOwn ? 'own' : 'other');
  if (id) div.dataset.id = id;

  div.innerHTML = `
    <div class="msg-meta">
      ${!isOwn ? `<span class="name">${escapeHtml(username)}</span>` : ''}
      <span>${timestamp}</span>
    </div>
    <div class="msg-bubble">${escapeHtml(message)}</div>
    ${isOwn ? `<div class="read-receipt" id="receipt-${id}">${receiptHTML(status)}</div>` : ''}
  `;
  messagesDiv.appendChild(div);
}

function receiptHTML(status) {
  if (status === 'seen')      return '<span class="receipt-seen">👀 Seen</span>';
  if (status === 'delivered') return '<span class="receipt-delivered">✔️✔️ Delivered</span>';
  return '<span class="receipt-sent">✔️ Sent</span>';
}

function updateReceiptUI(id, status) {
  const el = document.getElementById(`receipt-${id}`);
  if (el) el.innerHTML = receiptHTML(status);
}

function appendDivider(text) {
  const div = document.createElement('div');
  div.classList.add('notification');
  div.textContent = text;
  messagesDiv.appendChild(div);
}

function updateTypingDisplay() {
  const names = [...typingUsers];
  if      (names.length === 0) typingDiv.textContent = '';
  else if (names.length === 1) typingDiv.textContent = `${names[0]} is typing...`;
  else                         typingDiv.textContent = `${names.join(', ')} are typing...`;
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── In-app notification banner ──
function showBanner(username, message) {
  const existing = document.querySelector('.notif-banner');
  if (existing) existing.remove();

  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=7c6fcd&color=fff&size=36`;
  const banner = document.createElement('div');
  banner.classList.add('notif-banner');
  banner.innerHTML = `
    <img src="${avatar}" alt="avatar" />
    <div class="notif-banner-text">
      <strong>${escapeHtml(username)}</strong>
      <span>${escapeHtml(message.substring(0, 60))}${message.length > 60 ? '...' : ''}</span>
    </div>
    <button class="notif-banner-close">✕</button>
  `;
  document.body.appendChild(banner);
  banner.querySelector('.notif-banner-close').addEventListener('click', () => banner.remove());
  setTimeout(() => banner.remove(), 4000);
}

// ── Browser push notification ──
function sendBrowserNotification(username, message) {
  if (Notification.permission !== 'granted') return;
  new Notification(`💬 ${username}`, {
    body: message.substring(0, 100),
    icon: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=7c6fcd&color=fff&size=64`,
  });
}
