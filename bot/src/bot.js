import { Client, GatewayIntentBits, Events, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { handleCommand } from './commands/handler.js';
import { ensureGuild, getGuildConfig, getFilteredWords, addLog } from './db.js';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
});

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('Managing the server');
});

client.on(Events.GuildCreate, (guild) => {
  ensureGuild(guild.id);
  console.log(`Joined guild: ${guild.name} (${guild.id})`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;
  const config = getGuildConfig(member.guild.id);

  const role = member.guild.roles.cache.find(r => r.name === 'Unverified');
  if (role) {
    await member.roles.add(role).catch(() => {});
  }

  if (config.welcome_channel) {
    const channel = member.guild.channels.cache.get(config.welcome_channel);
    if (channel?.isTextBased()) {
      const msg = (config.welcome_message || 'Welcome {user} to {server}!')
        .replace(/{user}/g, member.toString())
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, member.guild.name);
      channel.send(msg).catch(() => {});
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const config = ensureGuild(message.guild.id);

  if (config.filter_enabled) {
    const words = getFilteredWords(message.guild.id);
    if (words.length > 0) {
      const content = message.content.toLowerCase();
      const found = words.find(w => {
        const regex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(content);
      });
      if (found) {
        await message.delete().catch(() => {});
        addLog(message.guild.id, 'auto_filter', message.author.id, client.user.id, `Filtered word: ${found}`);
        const warn = await message.channel.send(`${message.author} That word is not allowed here.`).catch(() => {});
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
        return;
      }
    }
  }

  const prefix = config.prefix || '$';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  await handleCommand(message, commandName, args, prefix);
});
