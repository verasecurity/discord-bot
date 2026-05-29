import { Client, GatewayIntentBits, Events, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { handleCommand } from './commands/handler.js';
import { ensureGuild, getGuildConfig, getFilteredWords, addLog, createTicket, getOpenTicket, closeTicket } from './db.js';

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

  const prefix = config.prefix || '$';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const ownerRoleId = '1509482420557054013';
  const hasOwnerRole = message.member.roles.cache.has(ownerRoleId);
  const isGuildOwner = message.author.id === message.guild.ownerId;
  if (!hasOwnerRole && !isGuildOwner) {
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
    report: { label: 'Report', color: 0xe74c3c, categoryId: '1509935570036719686' },
  };

  const info = typeMap[interaction.values[0]];
  if (!info) return;

  const channelName = `${info.label.toLowerCase().replace(/[^a-z0-9]/g, '')}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const existingChannel = interaction.guild.channels.cache.find(
    c => c.name === channelName && c.type === ChannelType.GuildText
  );
  if (existingChannel) {
    return interaction.editReply({ content: `You already have a ticket: ${existingChannel}`);
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
