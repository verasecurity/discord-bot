import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export async function unlock(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('You need Manage Channels permission.');
  }

  await message.channel.permissionOverwrites.delete(message.guild.id).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0x44ff44)
    .setTitle('Channel Unlocked')
    .setDescription(`This channel has been unlocked by ${message.author}.`)
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
