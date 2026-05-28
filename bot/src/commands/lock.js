import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export async function lock(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('You need Manage Channels permission.');
  }

  await message.channel.permissionOverwrites.edit(message.guild.id, {
    SendMessages: false,
  });

  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('Channel Locked')
    .setDescription(`This channel has been locked by ${message.author}.`)
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
