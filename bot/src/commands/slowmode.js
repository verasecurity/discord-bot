import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export async function slowmode(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply('You need Manage Channels permission.');
  }

  if (args.length === 0) {
    const current = message.channel.rateLimitPerUser;
    return message.reply(`Current slowmode: ${current} seconds. Use \`$slowmode <seconds>\` to change.`);
  }

  if (args[0] === 'off') {
    await message.channel.setRateLimitPerUser(0);
    return message.reply('Slowmode disabled.');
  }

  const seconds = parseInt(args[0]);
  if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
    return message.reply('Provide a number between 0 and 21600 (6 hours).');
  }

  await message.channel.setRateLimitPerUser(seconds);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Slowmode Updated')
    .setDescription(`Slowmode set to **${seconds}** seconds by ${message.author}.`)
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
