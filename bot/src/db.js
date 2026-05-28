import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'bot.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '$',
    mod_log_channel TEXT,
    welcome_channel TEXT,
    welcome_message TEXT DEFAULT 'Welcome {user} to {server}!',
    mute_role TEXT,
    ticket_category TEXT,
    filter_enabled INTEGER DEFAULT 1,
    auto_role_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS custom_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    cooldown INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT DEFAULT 'No reason provided',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_id TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS moderation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT DEFAULT 'No reason provided',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS filtered_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    word TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
  );
`);

const stmts = {
  getGuild: db.prepare('SELECT * FROM guilds WHERE id = ?'),
  upsertGuild: db.prepare(`
    INSERT INTO guilds (id, prefix, mod_log_channel, welcome_channel, welcome_message, mute_role, ticket_category, filter_enabled, auto_role_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      prefix = COALESCE(EXCLUDED.prefix, guilds.prefix),
      mod_log_channel = COALESCE(EXCLUDED.mod_log_channel, guilds.mod_log_channel),
      welcome_channel = COALESCE(EXCLUDED.welcome_channel, guilds.welcome_channel),
      welcome_message = COALESCE(EXCLUDED.welcome_message, guilds.welcome_message),
      mute_role = COALESCE(EXCLUDED.mute_role, guilds.mute_role),
      ticket_category = COALESCE(EXCLUDED.ticket_category, guilds.ticket_category),
      filter_enabled = COALESCE(EXCLUDED.filter_enabled, guilds.filter_enabled),
      auto_role_enabled = COALESCE(EXCLUDED.auto_role_enabled, guilds.auto_role_enabled)
  `),
  getCommands: db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND enabled = 1'),
  getAllCommands: db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?'),
  getCommandByTrigger: db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND trigger = ? AND enabled = 1'),
  createCommand: db.prepare('INSERT INTO custom_commands (guild_id, trigger, response, type, cooldown) VALUES (?, ?, ?, ?, ?)'),
  updateCommand: db.prepare('UPDATE custom_commands SET trigger = ?, response = ?, type = ?, cooldown = ?, enabled = ? WHERE id = ? AND guild_id = ?'),
  deleteCommand: db.prepare('DELETE FROM custom_commands WHERE id = ? AND guild_id = ?'),
  addWarning: db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)'),
  getWarnings: db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC'),
  clearWarnings: db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?'),
  addMute: db.prepare('INSERT INTO mutes (guild_id, user_id, role_id, expires_at) VALUES (?, ?, ?, ?)'),
  removeMute: db.prepare('DELETE FROM mutes WHERE guild_id = ? AND user_id = ?'),
  getMutes: db.prepare('SELECT * FROM mutes WHERE guild_id = ?'),
  createTicket: db.prepare('INSERT INTO tickets (guild_id, channel_id, creator_id) VALUES (?, ?, ?)'),
  closeTicket: db.prepare("UPDATE tickets SET status = 'closed' WHERE channel_id = ?"),
  getOpenTicket: db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ? AND status = 'open'"),
  getTickets: db.prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC'),
  getFilteredWords: db.prepare('SELECT * FROM filtered_words WHERE guild_id = ?'),
  getFilteredWord: db.prepare('SELECT * FROM filtered_words WHERE guild_id = ? AND LOWER(word) = LOWER(?)'),
  addFilteredWord: db.prepare('INSERT OR IGNORE INTO filtered_words (guild_id, word) VALUES (?, LOWER(?))'),
  removeFilteredWord: db.prepare('DELETE FROM filtered_words WHERE guild_id = ? AND LOWER(word) = LOWER(?)'),
  addLog: db.prepare('INSERT INTO moderation_logs (guild_id, action, user_id, moderator_id, reason) VALUES (?, ?, ?, ?, ?)'),
  getLogs: db.prepare('SELECT * FROM moderation_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'),
  getLogsCount: db.prepare('SELECT COUNT(*) as count FROM moderation_logs WHERE guild_id = ?'),
};

export function ensureGuild(guildId) {
  const existing = stmts.getGuild.get(guildId);
  if (!existing) {
    stmts.upsertGuild.run(guildId, '$', null, null, null, null, null, 1, 1);
    return { id: guildId, prefix: '$', mod_log_channel: null, welcome_channel: null, welcome_message: null, mute_role: null, ticket_category: null, filter_enabled: 1, auto_role_enabled: 1 };
  }
  return existing;
}

export function getCommands(guildId, all = false) {
  return all ? stmts.getAllCommands.all(guildId) : stmts.getCommands.all(guildId);
}

export function getCommandByTrigger(guildId, trigger) {
  return stmts.getCommandByTrigger.get(guildId, trigger);
}

export function createCommand(guildId, trigger, response, type = 'text', cooldown = 0) {
  stmts.createCommand.run(guildId, trigger, response, type, cooldown);
  return stmts.getAllCommands.all(guildId);
}

export function updateCommand(id, guildId, data) {
  stmts.updateCommand.run(data.trigger, data.response, data.type, data.cooldown, data.enabled ?? 1, id, guildId);
  return stmts.getAllCommands.all(guildId);
}

export function deleteCommand(id, guildId) {
  stmts.deleteCommand.run(id, guildId);
  return stmts.getAllCommands.all(guildId);
}

export function addWarning(guildId, userId, moderatorId, reason) {
  stmts.addWarning.run(guildId, userId, moderatorId, reason);
  return stmts.getWarnings.all(guildId, userId);
}

export function getWarnings(guildId, userId) {
  return stmts.getWarnings.all(guildId, userId);
}

export function clearWarnings(guildId, userId) {
  stmts.clearWarnings.run(guildId, userId);
}

export function addMute(guildId, userId, roleId, expiresAt) {
  stmts.addMute.run(guildId, userId, roleId, expiresAt);
}

export function removeMute(guildId, userId) {
  stmts.removeMute.run(guildId, userId);
}

export function getMutes(guildId) {
  return stmts.getMutes.all(guildId);
}

export function addLog(guildId, action, userId, moderatorId, reason) {
  stmts.addLog.run(guildId, action, userId, moderatorId, reason);
}

export function getLogs(guildId, limit = 50, offset = 0) {
  return stmts.getLogs.all(guildId, limit, offset);
}

export function getLogsCount(guildId) {
  return stmts.getLogsCount.get(guildId).count;
}

export function getGuildConfig(guildId) {
  return stmts.getGuild.get(guildId) ?? ensureGuild(guildId);
}

export function updateGuildConfig(guildId, config) {
  const existing = getGuildConfig(guildId);
  stmts.upsertGuild.run(
    guildId,
    config.prefix ?? existing.prefix,
    config.mod_log_channel ?? existing.mod_log_channel,
    config.welcome_channel ?? existing.welcome_channel,
    config.welcome_message ?? existing.welcome_message,
    config.mute_role ?? existing.mute_role,
    config.ticket_category ?? existing.ticket_category,
    config.filter_enabled ?? existing.filter_enabled,
    config.auto_role_enabled ?? existing.auto_role_enabled
  );
  return getGuildConfig(guildId);
}

export function getFilteredWords(guildId) {
  return stmts.getFilteredWords.all(guildId).map(r => r.word);
}

export function addFilteredWord(guildId, word) {
  stmts.addFilteredWord.run(guildId, word);
}

export function removeFilteredWord(guildId, word) {
  stmts.removeFilteredWord.run(guildId, word);
}

export function createTicket(guildId, channelId, creatorId) {
  stmts.createTicket.run(guildId, channelId, creatorId);
}

export function closeTicket(channelId) {
  stmts.closeTicket.run(channelId);
}

export function getOpenTicket(guildId, channelId) {
  return stmts.getOpenTicket.get(guildId, channelId);
}

export function getTickets(guildId) {
  return stmts.getTickets.all(guildId);
}

export default db;
