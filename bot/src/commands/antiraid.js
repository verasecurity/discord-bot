import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, updateGuildConfig } from '../db.js';

export async function antiraidCommand(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return message.reply('You need Manage Messages permission.');
  }

  const config = getGuildConfig(message.guild.id);
  const enabled = config.anti_raid_enabled ? 0 : 1;
  updateGuildConfig(message.guild.id, { anti_raid_enabled: enabled });

  const embed = new EmbedBuilder()
    .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
    .setTitle('Anti-Raid')
    .setDescription(`Anti-raid protection is now **${enabled ? 'enabled' : 'disabled'}**.`)
    .addFields(
      { name: 'Toggleable', value: [
        '• Blocks Discord invite links',
        '• Rate limits messages (5 per 3s)',
        '• Progressive timeout: 10m → 2h → 24h',
      ].join('\n') },
      { name: 'Always Active', value: [
        '• Blocks zalgo / excessive unicode',
        '• Blocks mass mentions (>5)',
        '• Blocks excessive caps (70%+)',
        '• Blocks mass custom emojis (>5)',
      ].join('\n') }
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
