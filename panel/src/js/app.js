let currentGuildId = null;

function login() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) return;
  API_KEY = key;
  fetch('/api/status', { headers: { 'x-api-key': key } })
    .then(r => {
      if (!r.ok) throw new Error('Invalid key');
      return r.json();
    })
    .then(status => {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      document.getElementById('app').style.flexDirection = 'column';
      document.getElementById('app').style.height = '100vh';
      localStorage.setItem('api_key', key);
      initApp();
    })
    .catch(() => {
      document.getElementById('login-error').textContent = 'Invalid API key';
    });
}

function logout() {
  localStorage.removeItem('api_key');
  location.reload();
}

const savedKey = localStorage.getItem('api_key');
if (savedKey) {
  API_KEY = savedKey;
  fetch('/api/status', { headers: { 'x-api-key': savedKey } })
    .then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then(() => {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      document.getElementById('app').style.flexDirection = 'column';
      document.getElementById('app').style.height = '100vh';
      initApp();
    })
    .catch(() => localStorage.removeItem('api_key'));
}

async function initApp() {
  loadOverview();
  loadGuildSelects();
  loadGuilds();
  loadInviteLink();
}

async function loadOverview() {
  try {
    const status = await apiGet('/status');
    document.getElementById('stat-guilds').textContent = status.guilds;
    document.getElementById('stat-users').textContent = status.users;
    document.getElementById('stat-ping').textContent = `${status.ping}ms`;
    const badge = document.getElementById('status-badge');
    if (status.online) {
      badge.textContent = 'Online';
      badge.className = 'badge online';
    } else {
      badge.textContent = 'Offline';
      badge.className = 'badge offline';
    }
    const u = status.uptime;
    const seconds = Math.floor((u / 1000) % 60);
    const minutes = Math.floor((u / (1000 * 60)) % 60);
    const hours = Math.floor((u / (1000 * 60 * 60)) % 24);
    const days = Math.floor(u / (1000 * 60 * 60 * 24));
    document.getElementById('stat-uptime').textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } catch {}
}

async function loadGuildSelects() {
  try {
    const guilds = await apiGet('/guilds');
    const selects = ['cmd-guild-select', 'log-guild-select', 'config-guild-select', 'ticket-guild-select', 'filter-guild-select'];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      sel.innerHTML = guilds.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    });
  } catch {}
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('aside li').forEach(l => l.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`aside li[onclick*="${page}"]`)?.classList.add('active');

  if (page === 'guilds' && !currentGuildId) loadGuilds();
  if (page === 'commands') loadCommands();
  if (page === 'logs') loadLogs();
  if (page === 'tickets') loadTickets();
  if (page === 'filter') loadFilter();
  if (page === 'config') loadConfig();
  if (page === 'overview') loadOverview();
}

async function loadGuilds() {
  try {
    const guilds = await apiGet('/guilds');
    document.getElementById('guild-list').innerHTML = guilds.map(g => `
      <div class="guild-card" onclick="showGuildDetail('${g.id}')">
        <strong>${g.name}</strong>
        <span>${g.memberCount} members</span>
      </div>
    `).join('');
  } catch {}
}

async function showGuildDetail(id) {
  currentGuildId = id;
  try {
    const g = await apiGet(`/guilds/${id}`);
    document.getElementById('guild-list').style.display = 'none';
    document.getElementById('guild-detail').style.display = 'block';
    document.getElementById('guild-info').innerHTML = `
      <h3>${g.name}</h3>
      <p>ID: ${g.id}</p>
      <p>Members: ${g.memberCount}</p>
      <p>Owner ID: ${g.ownerId}</p>
      <h4>Config</h4>
      <p>Prefix: <code>${g.config.prefix}</code></p>
      <p>Commands: ${g.commands.length}</p>
      <p>Mod Logs: ${g.logsCount}</p>
    `;
  } catch {}
}

function backToGuilds() {
  currentGuildId = null;
  document.getElementById('guild-list').style.display = '';
  document.getElementById('guild-detail').style.display = 'none';
}

async function loadCommands() {
  const guildId = document.getElementById('cmd-guild-select').value;
  if (!guildId) return;
  try {
    const cmds = await apiGet(`/guilds/${guildId}/commands`);
    document.getElementById('commands-body').innerHTML = cmds.map(c => `
      <tr>
        <td>${c.trigger}</td>
        <td>${c.response.substring(0, 50)}${c.response.length > 50 ? '...' : ''}</td>
        <td>${c.enabled ? 'Active' : 'Disabled'}</td>
        <td>
          <button onclick="editCommand(${c.id}, '${c.trigger}', '${c.response.replace(/'/g, "\\'")}', ${c.enabled})">Edit</button>
          <button onclick="deleteCommand(${c.id})" class="btn-danger">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch {}
}

function showAddCommand() {
  document.getElementById('cmd-form-title').textContent = 'Add Command';
  document.getElementById('cmd-edit-id').value = '';
  document.getElementById('cmd-trigger').value = '';
  document.getElementById('cmd-response').value = '';
  document.getElementById('command-form').style.display = 'block';
}

function editCommand(id, trigger, response, enabled) {
  document.getElementById('cmd-form-title').textContent = 'Edit Command';
  document.getElementById('cmd-edit-id').value = id;
  document.getElementById('cmd-trigger').value = trigger;
  document.getElementById('cmd-response').value = response;
  document.getElementById('command-form').style.display = 'block';
}

function cancelCommandForm() {
  document.getElementById('command-form').style.display = 'none';
}

async function saveCommand() {
  const guildId = document.getElementById('cmd-guild-select').value;
  const id = document.getElementById('cmd-edit-id').value;
  const trigger = document.getElementById('cmd-trigger').value.trim();
  const response = document.getElementById('cmd-response').value.trim();
  if (!trigger || !response) return alert('Trigger and response required');

  try {
    if (id) {
      await apiPut(`/guilds/${guildId}/commands/${id}`, { trigger, response });
    } else {
      await apiPost(`/guilds/${guildId}/commands`, { trigger, response });
    }
    cancelCommandForm();
    loadCommands();
  } catch (e) { alert('Error: ' + e.message); }
}

async function deleteCommand(id) {
  if (!confirm('Delete this command?')) return;
  const guildId = document.getElementById('cmd-guild-select').value;
  try {
    await apiDelete(`/guilds/${guildId}/commands/${id}`);
    loadCommands();
  } catch (e) { alert('Error: ' + e.message); }
}

async function loadLogs() {
  const guildId = document.getElementById('log-guild-select').value;
  if (!guildId) return;
  try {
    const data = await apiGet(`/guilds/${guildId}/logs`);
    document.getElementById('logs-body').innerHTML = data.logs.map(l => `
      <tr>
        <td><span class="badge action-${l.action}">${l.action}</span></td>
        <td>${l.user_id}</td>
        <td>${l.moderator_id}</td>
        <td>${l.reason}</td>
        <td>${new Date(l.created_at).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch {}
}

async function loadConfig() {
  const guildId = document.getElementById('config-guild-select').value;
  if (!guildId) return;
  try {
    const cfg = await apiGet(`/guilds/${guildId}/config`);
    document.getElementById('config-prefix').value = cfg.prefix || '$';
    document.getElementById('config-mod-log').value = cfg.mod_log_channel || '';
    document.getElementById('config-mute-role').value = cfg.mute_role || '';
    document.getElementById('config-welcome-channel').value = cfg.welcome_channel || '';
    document.getElementById('config-welcome-msg').value = cfg.welcome_message || '';
    document.getElementById('config-ticket-category').value = cfg.ticket_category || '';
  } catch {}
}

async function saveConfig() {
  const guildId = document.getElementById('config-guild-select').value;
  const config = {
    prefix: document.getElementById('config-prefix').value.trim(),
    mod_log_channel: document.getElementById('config-mod-log').value.trim() || null,
    mute_role: document.getElementById('config-mute-role').value.trim() || null,
    welcome_channel: document.getElementById('config-welcome-channel').value.trim() || null,
    welcome_message: document.getElementById('config-welcome-msg').value.trim() || null,
    ticket_category: document.getElementById('config-ticket-category').value.trim() || null,
  };
  try {
    await apiPut(`/guilds/${guildId}/config`, config);
    alert('Config saved!');
  } catch (e) { alert('Error: ' + e.message); }
}

async function loadTickets() {
  const guildId = document.getElementById('ticket-guild-select').value;
  if (!guildId) return;
  try {
    const tickets = await apiGet(`/guilds/${guildId}/tickets`);
    document.getElementById('tickets-body').innerHTML = tickets.map(t => `
      <tr>
        <td><code>${t.channel_id}</code></td>
        <td>${t.creator_id}</td>
        <td><span class="badge ${t.status === 'open' ? 'online' : 'offline'}">${t.status}</span></td>
        <td>${new Date(t.created_at).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch {}
}

async function loadInviteLink() {
  try {
    const data = await apiGet('/invite');
    document.getElementById('invite-link').href = data.url;
    document.getElementById('invite-link').textContent = data.url;
  } catch {}
}

async function loadFilter() {
  const guildId = document.getElementById('filter-guild-select').value;
  if (!guildId) return;
  try {
    const data = await apiGet(`/guilds/${guildId}/filter`);
    document.getElementById('filter-status').textContent = data.enabled ? 'Enabled' : 'Disabled';
    document.getElementById('filter-status').style.color = data.enabled ? '#2ecc71' : '#e74c3c';
    document.getElementById('filter-words-body').innerHTML = data.words.map(w => `
      <tr>
        <td>${w}</td>
        <td><button onclick="removeFilterWord('${w}')" class="btn-danger">Remove</button></td>
      </tr>
    `).join('');
  } catch {}
}

async function addFilterWord() {
  const guildId = document.getElementById('filter-guild-select').value;
  const word = document.getElementById('filter-word-input').value.trim();
  if (!word) return alert('Enter a word');
  try {
    await apiPost(`/guilds/${guildId}/filter`, { word });
    document.getElementById('filter-word-input').value = '';
    loadFilter();
  } catch (e) { alert('Error: ' + e.message); }
}

async function removeFilterWord(word) {
  const guildId = document.getElementById('filter-guild-select').value;
  try {
    await apiDelete(`/guilds/${guildId}/filter/${encodeURIComponent(word)}`);
    loadFilter();
  } catch (e) { alert('Error: ' + e.message); }
}

async function toggleFilter() {
  const guildId = document.getElementById('filter-guild-select').value;
  try {
    const cfg = await apiGet(`/guilds/${guildId}/config`);
    await apiPut(`/guilds/${guildId}/config`, { filter_enabled: cfg.filter_enabled ? 0 : 1 });
    loadFilter();
  } catch (e) { alert('Error: ' + e.message); }
}
