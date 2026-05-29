import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export async function lock(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('You need Manage Channels permission.');
  }

  await message.channel.permissionOverwrites.create(message.guild.id, {
    Deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads],
  });

  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('Channel Locked')
    .setDescription(`This channel has been locked by ${message.author}.`)
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
