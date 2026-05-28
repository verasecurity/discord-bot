import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getFilteredWords, addFilteredWord, removeFilteredWord, getGuildConfig, updateGuildConfig } from '../db.js';

export async function filterCommand(message, args, prefix) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return message.reply('You need Manage Messages permission.');
  }

  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'list') {
    const words = getFilteredWords(message.guild.id);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Filtered Words')
      .setDescription(words.length ? words.map((w, i) => `${i + 1}. ||${w}||`).join('\n') : 'No words filtered.')
      .setFooter({ text: `Use ${prefix}filter add <word> to add` });
    return message.reply({ embeds: [embed] });
  }

  if (sub === 'add') {
    const word = args.slice(1).join(' ');
    if (!word || word.length < 2) return message.reply('Provide a word to filter.');
    addFilteredWord(message.guild.id, word);
    return message.reply(`Added **${word}** to the filter.`);
  }

  if (sub === 'remove') {
    const word = args.slice(1).join(' ');
    if (!word) return message.reply('Provide a word to remove.');
    removeFilteredWord(message.guild.id, word);
    return message.reply(`Removed **${word}** from the filter.`);
  }

  if (sub === 'toggle') {
    const config = getGuildConfig(message.guild.id);
    const enabled = config.filter_enabled ? 0 : 1;
    updateGuildConfig(message.guild.id, { filter_enabled: enabled });
    return message.reply(`Filter is now **${enabled ? 'enabled' : 'disabled'}**.`);
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Word Filter')
    .setDescription([
      `${prefix}filter list — Show all filtered words`,
      `${prefix}filter add <word> — Add a word to filter`,
      `${prefix}filter remove <word> — Remove a word from filter`,
      `${prefix}filter toggle — Enable/disable the filter`,
    ].join('\n'));

  await message.reply({ embeds: [embed] });
}
