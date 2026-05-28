import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export async function removerole(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return message.reply('You need Manage Roles permission.');
  }

  const user = message.mentions.members.first();
  if (!user) return message.reply('Mention a user: `$removerole @user @role`');

  const role = message.mentions.roles.first();
  if (!role) return message.reply('Mention a role: `$removerole @user @role`');

  if (role.position >= message.member.roles.highest.position) {
    return message.reply('That role is higher than your highest role.');
  }

  if (!user.roles.cache.has(role.id)) {
    return message.reply(`${user.user.tag} does not have that role.`);
  }

  await user.roles.remove(role, `Role removed by ${message.author.tag}`);

  const embed = new EmbedBuilder()
    .setColor(role.hexColor || 0x5865f2)
    .setTitle('Role Removed')
    .addFields(
      { name: 'User', value: user.user.tag, inline: true },
      { name: 'Role', value: role.name, inline: true },
      { name: 'Moderator', value: message.author.tag, inline: true }
    )
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}
