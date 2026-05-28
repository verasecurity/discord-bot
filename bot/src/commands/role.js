import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export async function role(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return message.reply('You need Manage Roles permission.');
  }

  const user = message.mentions.members.first();
  if (!user) return message.reply('Mention a user: `$role @user @role`');

  const roleArg = message.mentions.roles.first();
  if (!roleArg) return message.reply('Mention a role: `$role @user @role`');

  if (roleArg.managed || roleArg.id === message.guild.id) {
    return message.reply('Cannot assign that role.');
  }

  if (roleArg.position >= message.member.roles.highest.position) {
    return message.reply('That role is higher than your highest role.');
  }

  if (user.roles.cache.has(roleArg.id)) {
    return message.reply(`${user.user.tag} already has that role.`);
  }

  await user.roles.add(roleArg, `Role added by ${message.author.tag}`);

  const embed = new EmbedBuilder()
    .setColor(roleArg.hexColor || 0x5865f2)
    .setTitle('Role Added')
    .addFields(
      { name: 'User', value: user.user.tag, inline: true },
      { name: 'Role', value: roleArg.name, inline: true },
      { name: 'Moderator', value: message.author.tag, inline: true }
    )
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}
