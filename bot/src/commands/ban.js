import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addLog } from '../db.js';

export async function ban(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return message.reply('You need Ban Members permission.');
  }

  const user = message.mentions.users.first();
  if (!user) return message.reply('Mention a user to ban.');

  const member = message.guild.members.cache.get(user.id);
  if (member && !member.bannable) return message.reply('That user is not bannable.');

  const reason = args.slice(1).join(' ') || 'No reason provided';

  await message.guild.members.ban(user, { reason });
  addLog(message.guild.id, 'ban', user.id, message.author.id, reason);

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('User Banned')
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: message.author.tag, inline: true },
      { name: 'Reason', value: reason }
    )
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}
