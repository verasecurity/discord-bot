import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export async function roleall(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return message.reply('You need Manage Roles permission.');
  }

  const role = message.mentions.roles.first();
  if (!role) return message.reply('Mention a role: `$roleall @role`');

  if (role.managed || role.id === message.guild.id) {
    return message.reply('Cannot assign that role.');
  }

  if (role.position >= message.member.roles.highest.position) {
    return message.reply('That role is higher than your highest role.');
  }

  const members = await message.guild.members.fetch();
  const targetMembers = members.filter(m => !m.user.bot && !m.roles.cache.has(role.id));

  if (targetMembers.size === 0) {
    return message.reply('All eligible members already have that role.');
  }

  const reply = await message.reply(`Adding ${role.name} to ${targetMembers.size} members...`);

  let added = 0;
  for (const [, member] of targetMembers) {
    try {
      await member.roles.add(role, `Mass role add by ${message.author.tag}`);
      added++;
    } catch {}
  }

  const embed = new EmbedBuilder()
    .setColor(role.hexColor || 0x5865f2)
    .setTitle('Mass Role Add Complete')
    .addFields(
      { name: 'Role', value: role.name, inline: true },
      { name: 'Added To', value: `${added} / ${targetMembers.size} members`, inline: true }
    )
    .setTimestamp();

  await reply.edit({ content: null, embeds: [embed] });
}
