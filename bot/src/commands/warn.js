import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addWarning, addLog, getWarnings } from '../db.js';

export async function warn(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return message.reply('You need Moderate Members permission.');
  }

  const user = message.mentions.users.first();
  if (!user) return message.reply('Mention a user to warn.');

  const reason = args.slice(1).join(' ') || 'No reason provided';

  addWarning(message.guild.id, user.id, message.author.id, reason);
  addLog(message.guild.id, 'warn', user.id, message.author.id, reason);

  const warnings = getWarnings(message.guild.id, user.id);

  const embed = new EmbedBuilder()
    .setColor(0xffaa00)
    .setTitle('Warning Issued')
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: message.author.tag, inline: true },
      { name: 'Reason', value: reason },
      { name: 'Total Warnings', value: `${warnings.length}` }
    )
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });

  try {
    await user.send(`You were warned in **${message.guild.name}**.\nReason: ${reason}`);
  } catch {}
}
