import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

const PANEL_CHANNEL_ID = '1509931175936786566';

const TICKET_TYPES = [
  { id: 'general', label: 'General', emoji: '🎫', desc: 'General inquiries and questions' },
  { id: 'support', label: 'Support', emoji: '🛠️', desc: 'Get help from the support team' },
  { id: 'rewards', label: 'Rewards', emoji: '🎁', desc: 'Claim your rewards' },
  { id: 'report', label: 'Report', emoji: '📢', desc: 'Report a user or issue' },
  { id: 'general2', label: 'General', emoji: '💬', desc: 'Other general matters' },
];

export async function panelCommand(message) {
  const channel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
  if (!channel) return message.reply(`Panel channel not found.`);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('✦ Syntax Ticket System V1 ✦')
    .setDescription([
      'Welcome to the ticket center!',
      '',
      'Use the dropdown below to select a topic',
      'and our team will get back to you shortly.',
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      `${TICKET_TYPES.map(t => `${t.emoji} **${t.label}** — ${t.desc}`).join('\n')}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
    ].join('\n'))
    .setFooter({ text: 'Syntax Ticket System V1', iconURL: message.guild.iconURL() })
    .setTimestamp();

  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('🎫 Select a ticket type...')
    .addOptions(
      TICKET_TYPES.map(t =>
        new StringSelectMenuOptionBuilder()
          .setLabel(t.label)
          .setValue(t.id)
          .setEmoji(t.emoji)
          .setDescription(t.desc)
      )
    );

  const row = new ActionRowBuilder().addComponents(select);

  await channel.send({ embeds: [embed], components: [row] });
  await message.reply('Ticket panel created!');
}
