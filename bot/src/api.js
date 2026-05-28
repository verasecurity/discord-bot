import { client } from './bot.js';
import { requireAuth } from './middleware/auth.js';
import {
  getGuildConfig, updateGuildConfig,
  getCommands, createCommand, updateCommand, deleteCommand,
  getLogs, getLogsCount, getWarnings, getMutes, getTickets,
  getFilteredWords, addFilteredWord, removeFilteredWord,
} from './db.js';

export function createAPI(app) {
  app.get('/api/status', (req, res) => {
    res.json({
      online: client.isReady(),
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      uptime: client.uptime,
      ping: client.ws.ping,
    });
  });

  app.get('/api/invite', (req, res) => {
    const id = process.env.CLIENT_ID;
    if (!id) return res.status(400).json({ error: 'CLIENT_ID not set' });
    res.json({
      url: `https://discord.com/api/oauth2/authorize?client_id=${id}&permissions=8&scope=bot`,
    });
  });

  app.use('/api', requireAuth);

  app.get('/api/guilds', (req, res) => {
    const guilds = client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.iconURL(),
      memberCount: g.memberCount,
      ownerId: g.ownerId,
    }));
    res.json(guilds);
  });

  app.get('/api/guilds/:id', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const config = getGuildConfig(guild.id);
    const commands = getCommands(guild.id, true);
    const logsCount = getLogsCount(guild.id);

    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
      ownerId: guild.ownerId,
      channels: guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type })),
      roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.color })),
      config,
      commands,
      logsCount,
    });
  });

  app.get('/api/guilds/:id/config', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json(getGuildConfig(guild.id));
  });

  app.put('/api/guilds/:id/config', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json(updateGuildConfig(guild.id, req.body));
  });

  app.get('/api/guilds/:id/commands', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json(getCommands(guild.id, true));
  });

  app.post('/api/guilds/:id/commands', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const { trigger, response, type, cooldown } = req.body;
    if (!trigger || !response) return res.status(400).json({ error: 'Trigger and response required' });
    res.json(createCommand(guild.id, trigger, response, type || 'text', cooldown || 0));
  });

  app.put('/api/guilds/:id/commands/:cmdId', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json(updateCommand(parseInt(req.params.cmdId), guild.id, req.body));
  });

  app.delete('/api/guilds/:id/commands/:cmdId', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json(deleteCommand(parseInt(req.params.cmdId), guild.id));
  });

  app.get('/api/guilds/:id/logs', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    res.json({ logs: getLogs(guild.id, limit, offset), total: getLogsCount(guild.id) });
  });

  app.get('/api/guilds/:id/warnings/:userId', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json(getWarnings(guild.id, req.params.userId));
  });

  app.get('/api/guilds/:id/mutes', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json(getMutes(guild.id));
  });

  app.get('/api/guilds/:id/tickets', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json(getTickets(guild.id));
  });

  app.get('/api/guilds/:id/filter', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    res.json({ words: getFilteredWords(guild.id), enabled: getGuildConfig(guild.id).filter_enabled });
  });

  app.post('/api/guilds/:id/filter', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: 'Word required' });
    addFilteredWord(guild.id, word);
    res.json({ words: getFilteredWords(guild.id) });
  });

  app.delete('/api/guilds/:id/filter/:word', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    removeFilteredWord(guild.id, req.params.word);
    res.json({ words: getFilteredWords(guild.id) });
  });
}
