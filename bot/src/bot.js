import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import { handleCommand } from './commands/handler.js';
import { ensureGuild, getGuildConfig } from './db.js';

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

  const guild = message.guild;
  if (!guild) return;

  const config = ensureGuild(guild.id);
  const prefix = config.prefix || '!';

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  await handleCommand(message, commandName, args, prefix);
});
