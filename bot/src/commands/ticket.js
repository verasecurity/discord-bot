import { EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { getGuildConfig, createTicket, closeTicket, getOpenTicket, addLog } from '../db.js';

export async function ticket(message, args) {
  const config = getGuildConfig(message.guild.id);
  const categoryId = config.ticket_category;

  const existing = getOpenTicket(message.guild.id, message.channel.id);
  if (existing) {
    return message.reply('This is already a ticket channel. Use `$add @user`, `$remove @user`, or `$close`.');
  }

  const channelName = `ticket-${message.author.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const existingChannel = message.guild.channels.cache.find(
    c => c.name === channelName && c.type === ChannelType.GuildText
  );
  if (existingChannel) {
    return message.reply(`You already have a ticket: ${existingChannel}`);
  }

  const category = categoryId ? message.guild.channels.cache.get(categoryId) : null;

  const ticketChannel = await message.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category?.id || null,
    permissionOverwrites: [
      { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: message.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: message.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
    ],
  });

  createTicket(message.guild.id, ticketChannel.id, message.author.id);
  addLog(message.guild.id, 'ticket_created', message.author.id, message.author.id, 'Ticket created');

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Ticket Created')
    .setDescription(`Support ticket for ${message.author}`)
    .addFields(
      { name: 'Useful Commands', value: [
        `\`$add @user\` — Add someone to this ticket`,
        `\`$remove @user\` — Remove someone from this ticket`,
        `\`$close\` — Close this ticket`,
      ].join('\n') }
    )
    .setTimestamp();

  await ticketChannel.send({ content: `${message.author}`, embeds: [embed] });
  await message.reply(`Ticket created: ${ticketChannel}`);
}

export async function add(message, args) {
  const ticketData = getOpenTicket(message.guild.id, message.channel.id);
  if (!ticketData) return message.reply('This is not an open ticket channel.');

  if (ticketData.creator_id !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Only the ticket creator or an admin can add users.');
  }

  const user = message.mentions.members.first();
  if (!user) return message.reply('Mention a user to add: `$add @user`');

  await message.channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(`${user} has been added to this ticket by ${message.author}.`)
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}

export async function remove(message, args) {
  const ticketData = getOpenTicket(message.guild.id, message.channel.id);
  if (!ticketData) return message.reply('This is not an open ticket channel.');

  if (ticketData.creator_id !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Only the ticket creator or an admin can remove users.');
  }

  const user = message.mentions.members.first();
  if (!user) return message.reply('Mention a user to remove: `$remove @user`');

  if (user.id === ticketData.creator_id) {
    return message.reply('Cannot remove the ticket creator.');
  }

  await message.channel.permissionOverwrites.delete(user.id).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0xff6600)
    .setDescription(`${user} has been removed from this ticket by ${message.author}.`)
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}

export async function close(message) {
  const ticketData = getOpenTicket(message.guild.id, message.channel.id);
  if (!ticketData) return message.reply('This is not an open ticket channel.');

  if (ticketData.creator_id !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('Only the ticket creator or an admin can close this ticket.');
  }

  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('Ticket Closing')
    .setDescription('This ticket will be deleted in 10 seconds.')
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });

  closeTicket(message.channel.id);
  addLog(message.guild.id, 'ticket_closed', ticketData.creator_id, message.author.id, 'Ticket closed');

  setTimeout(() => {
    message.channel.delete().catch(() => {});
  }, 10000);
}
