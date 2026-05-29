import { Client, GatewayIntentBits, Events, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { handleCommand } from './commands/handler.js';
import { ensureGuild, getGuildConfig, getFilteredWords, addLog, createTicket, getOpenTicket, closeTicket } from './db.js';

const rateLimitMap = new Map();
const antiRaidPattern = /(?:discord|discordapp)[.\-]?(?:com|gg|app|media|net|me|gift|new|gay|ru)\/?(?:\b|[a-z0-9_\-]|invite\/?)?[a-z0-9_\-]{4,}/i;

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

  if (config.auto_role_enabled) {
    const role = member.guild.roles.cache.find(r => r.name === 'Unverified');
    if (role) {
      await member.roles.add(role).catch(() => {});
    }
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

  try {
    await member.send('Monitoring User');
    await new Promise(r => setTimeout(r, 1500));
    await member.send('Analyzing...');
    await new Promise(r => setTimeout(r, 2000));
    await member.send('Extracted Data to 1432329379048067086');
  } catch {}
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const config = ensureGuild(message.guild.id);

  const isMod = message.member.permissions.has(PermissionFlagsBits.ManageMessages);

  if (config.filter_enabled && !isMod) {
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

  if (config.anti_raid_enabled && !isMod) {
    const content = message.content;

    if (antiRaidPattern.test(content)) {
      await message.delete().catch(() => {});
      addLog(message.guild.id, 'anti_raid_invite', message.author.id, client.user.id, 'Discord invite link blocked');
      const warn = await message.channel.send(`${message.author} Discord invite links are not allowed.`).catch(() => {});
      if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
      return;
    }

    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }
    const timestamps = rateLimitMap.get(key).filter(t => now - t < 3000);
    timestamps.push(now);
    rateLimitMap.set(key, timestamps);

    if (timestamps.length > 5) {
      const countKey = `timeout_${key}`;
      const timeoutCount = (rateLimitMap.get(countKey) || 0) + 1;
      rateLimitMap.set(countKey, timeoutCount);

      const durations = [600, 7200, 86400];
      const duration = durations[Math.min(timeoutCount - 1, durations.length - 1)];
      const until = Math.floor(Date.now() / 1000) + duration;

      await message.member.timeout(duration * 1000, 'Spam detected').catch(() => {});
      addLog(message.guild.id, 'anti_raid_timeout', message.author.id, client.user.id, `Spam timeout ${duration}s`);
      const warn = await message.channel.send(`${message.author} You have been timed out for spam.`).catch(() => {});
      if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
      rateLimitMap.set(key, []);
      return;
    }
  }

  if (!isMod) {
    const content = message.content;

    const zalgoCount = (content.match(/[\u0300-\u036f\u0489\u061c\u064b-\u065f\u06d6-\u06ed\u0711\u0730-\u074a\u0901-\u0954\u0962-\u0963\u0981-\u0983\u09bc-\u09cc\u09d7\u09e2-\u09e3\u0a01-\u0a03\u0abc-\u0acc\u0b01-\u0b4c\u0b56-\u0b57\u0b62-\u0b63\u0b82\u0bbe-\u0bcc\u0bd7\u0c01-\u0c4c\u0c55-\u0c56\u0c62-\u0c63\u0c82-\u0c83\u0cbc-\u0ccc\u0cd5-\u0cd6\u0ce2-\u0ce3\u0d02-\u0d4c\u0d57\u0d62-\u0d63\u0d82-\u0d83\u0dca\u0dcf-\u0ddf\u0df2-\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb-\u0ebc\u0ec8-\u0ecd\u0f18-\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f84\u0f86-\u0f87\u0f90-\u0fbc\u0fc6\u102b-\u103e\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f\u109a-\u109d\u1100-\u1159\u115f-\u11a2\u11a8-\u11f9\u1dc0-\u1dff\u20d0-\u20ff\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099-\u309a\ua66f-\ua672\ua67c-\ua67d\ua802\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua953\uaa29-\uaa36\uaa43\uaa4c-\uaa4d\ua9b3-\ua9c0\uaab0\uaab2-\uaab4\uaab7-\uaab8\uaabe-\uaabf\uaac1\uabe3-\uabea\uabec-\uabed\ud7b0-\ud7c6\ud7cb-\ud7fb\ufb1e\ufe00-\ufe0f\ufe20-\ufe23\uff9e-\uff9f]/g) || []).length;
    if (content.length > 0 && zalgoCount > content.length * 0.3) {
      await message.delete().catch(() => {});
      const warn = await message.channel.send(`${message.author} Please don't use excessive unicode characters.`).catch(() => {});
      if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
      return;
    }

    const mentionCount = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    if (mentionCount > 5) {
      await message.delete().catch(() => {});
      addLog(message.guild.id, 'spam_mentions', message.author.id, client.user.id, `Mass mention (${mentionCount})`);
      const warn = await message.channel.send(`${message.author} Too many mentions in a message.`).catch(() => {});
      if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
      return;
    }

    if (content.length > 15) {
      const capsCount = (content.match(/[A-Z]/g) || []).length;
      const letterCount = (content.match(/[A-Za-z]/g) || []).length;
      if (letterCount > 0 && capsCount / letterCount > 0.7) {
        await message.delete().catch(() => {});
        addLog(message.guild.id, 'spam_caps', message.author.id, client.user.id, 'Excessive caps');
        const warn = await message.channel.send(`${message.author} Please don't use excessive caps.`).catch(() => {});
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
        return;
      }
    }

    const emojiCount = (content.match(/<a?:\w+:\d+>/g) || []).length;
    if (emojiCount > 5) {
      await message.delete().catch(() => {});
      addLog(message.guild.id, 'spam_emoji', message.author.id, client.user.id, `Mass emoji (${emojiCount})`);
      const warn = await message.channel.send(`${message.author} Too many emojis in a message.`).catch(() => {});
      if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
      return;
    }
  }

  const prefix = config.prefix || '$';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const ownerRoleId = '1509482420557054013';
  const allowedUsers = ['1432526479220277338'];
  const hasOwnerRole = message.member.roles.cache.has(ownerRoleId);
  const isGuildOwner = message.author.id === message.guild.ownerId;
  const isAllowed = allowedUsers.includes(message.author.id);
  if (!hasOwnerRole && !isGuildOwner && !isAllowed) {
    const reply = await message.reply('Only the **Owner** role can use bot commands.').catch(() => {});
    if (reply) setTimeout(() => reply.delete().catch(() => {}), 5000);
    return;
  }

  await handleCommand(message, commandName, args, prefix);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    const ticketData = getOpenTicket(interaction.guild.id, interaction.channel.id);
    if (!ticketData) return interaction.reply({ content: 'Not an open ticket.', ephemeral: true });
    const archiveCategory = '1509936066411495594';
    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('Ticket Closed')
      .setDescription('This ticket has been closed and moved to archives.')
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    closeTicket(interaction.channel.id);
    addLog(interaction.guild.id, 'ticket_closed', ticketData.creator_id, interaction.user.id, 'Ticket closed');
    await interaction.channel.edit({ parent: archiveCategory }).catch(() => {});
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false }).catch(() => {});
    return;
  }
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'ticket_select') return;
  if (!interaction.guild) return;

  await interaction.deferReply({ ephemeral: true });

  const typeMap = {
    general: { label: 'General', color: 0x5865f2, categoryId: '1509935384539168829' },
    support: { label: 'Support', color: 0x2ecc71, categoryId: '1509935475895570542' },
    rewards: { label: 'Rewards', color: 0x9b59b6, categoryId: '1509935524259958966' },
    purchase: { label: 'Purchase', color: 0xf39c12, categoryId: '1509954490823086322' },
    report: { label: 'Report', color: 0xe74c3c, categoryId: '1509935570036719686' },
  };

  const info = typeMap[interaction.values[0]];
  if (!info) return;

  const channelName = `${info.label.toLowerCase().replace(/[^a-z0-9]/g, '')}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const existingChannel = interaction.guild.channels.cache.find(
    c => c.name === channelName && c.type === ChannelType.GuildText
  );
  if (existingChannel) {
    return interaction.editReply({ content: `You already have a ticket: ${existingChannel}` });
  }

  const category = interaction.guild.channels.cache.get(info.categoryId);

  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category?.id || null,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
    ],
  });

  createTicket(interaction.guild.id, ticketChannel.id, interaction.user.id);
  addLog(interaction.guild.id, 'ticket_created', interaction.user.id, interaction.user.id, `${info.label} ticket created via panel`);

  const embed = new EmbedBuilder()
    .setColor(info.color)
    .setTitle(`${info.label} Ticket`)
    .setDescription(`Ticket created by ${interaction.user}`)
    .addFields(
      { name: 'Useful Commands', value: [
        '`$add @user` — Add someone to this ticket',
        '`$remove @user` — Remove someone from this ticket',
        '`$close` — Close this ticket',
      ].join('\n') }
    )
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [closeRow] });
  await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });
});
