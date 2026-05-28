import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addLog } from '../db.js';

export async function kick(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return message.reply('You need Kick Members permission.');
  }

  const user = message.mentions.users.first();
  if (!user) return message.reply('Mention a user to kick.');

  const member = message.guild.members.cache.get(user.id);
  if (!member?.kickable) return message.reply('That user is not kickable.');

  const reason = args.slice(1).join(' ') || 'No reason provided';

  await member.kick(reason);
  addLog(message.guild.id, 'kick', user.id, message.author.id, reason);

  const embed = new EmbedBuilder()
    .setColor(0xff6600)
    .setTitle('User Kicked')
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: message.author.tag, inline: true },
      { name: 'Reason', value: reason }
    )
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}
