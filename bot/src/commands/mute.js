import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addMute, removeMute, addLog, getGuildConfig } from '../db.js';

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (multipliers[unit] || 60000);
}

export async function mute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return message.reply('You need Moderate Members permission.');
  }

  const user = message.mentions.users.first();
  if (!user) return message.reply('Mention a user to mute.');

  const member = message.guild.members.cache.get(user.id);
  if (!member?.moderatable) return message.reply('That user cannot be muted.');

  const durationStr = args[1];
  const durationMs = parseDuration(durationStr);
  const reason = durationMs ? args.slice(2).join(' ') || 'No reason provided' : args.slice(1).join(' ') || 'No reason provided';

  const config = getGuildConfig(message.guild.id);
  let muteRole = config.mute_role ? message.guild.roles.cache.get(config.mute_role) : null;

  if (!muteRole) {
    muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
    if (!muteRole) {
      muteRole = await message.guild.roles.create({
        name: 'Muted',
        color: 0x808080,
        reason: 'Auto-created mute role',
      });
      message.guild.channels.cache.forEach(ch => {
        ch.permissionOverwrites.create(muteRole, { SendMessages: false, AddReactions: false }).catch(() => {});
      });
    }
  }

  await member.roles.add(muteRole, reason);

  const expiresAt = durationMs ? new Date(Date.now() + durationMs).toISOString() : null;
  addMute(message.guild.id, user.id, muteRole.id, expiresAt);
  addLog(message.guild.id, 'mute', user.id, message.author.id, reason);

  if (expiresAt) {
    setTimeout(async () => {
      try {
        const m = message.guild.members.cache.get(user.id);
        if (m) await m.roles.remove(muteRole.id);
        removeMute(message.guild.id, user.id);
      } catch {}
    }, durationMs);
  }

  const embed = new EmbedBuilder()
    .setColor(0x888888)
    .setTitle('User Muted')
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: message.author.tag, inline: true },
      { name: 'Duration', value: durationMs ? `${durationStr}` : 'Indefinite', inline: true },
      { name: 'Reason', value: reason }
    )
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}

export async function unmute(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return message.reply('You need Moderate Members permission.');
  }

  const user = message.mentions.users.first();
  if (!user) return message.reply('Mention a user to unmute.');

  const member = message.guild.members.cache.get(user.id);
  if (!member) return message.reply('User not found.');

  const config = getGuildConfig(message.guild.id);
  const muteRole = config.mute_role ? message.guild.roles.cache.get(config.mute_role) : message.guild.roles.cache.find(r => r.name === 'Muted');

  if (muteRole && member.roles.cache.has(muteRole.id)) {
    await member.roles.remove(muteRole.id);
  }

  removeMute(message.guild.id, user.id);
  addLog(message.guild.id, 'unmute', user.id, message.author.id, 'Manually unmuted');

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('User Unmuted')
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: message.author.tag, inline: true }
    )
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}
