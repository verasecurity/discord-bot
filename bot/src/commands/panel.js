import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const PANEL_CHANNEL_ID = '1509931175936786566';

const TICKET_TYPES = [
  { id: 'general', label: 'General', emoji: '🎫', style: ButtonStyle.Primary, desc: 'General inquiries and questions' },
  { id: 'support', label: 'Support', emoji: '🛠️', style: ButtonStyle.Success, desc: 'Get help from the support team' },
  { id: 'rewards', label: 'Rewards', emoji: '🎁', style: ButtonStyle.Secondary, desc: 'Claim your rewards' },
  { id: 'report', label: 'Report', emoji: '📢', style: ButtonStyle.Danger, desc: 'Report a user or issue' },
  { id: 'general2', label: 'General', emoji: '💬', style: ButtonStyle.Primary, desc: 'Other general matters' },
];

export async function panelCommand(message) {
  const channel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
  if (!channel) return message.reply(`Panel channel not found. Please check the channel ID.`);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('✦ Syntax Ticket System V1 ✦')
    .setDescription([
      'Welcome to the ticket center!',
      '',
      'Select an option below to create a ticket.',
      'Our team will assist you as soon as possible.',
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      `${TICKET_TYPES.map(t => `${t.emoji} **${t.label}** — ${t.desc}`).join('\n')}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      '> ✦ Click a button to open a ticket',
    ].join('\n'))
    .setFooter({ text: 'Ticket System', iconURL: message.guild.iconURL() })
    .setTimestamp();

  const rows = [];
  for (let i = 0; i < TICKET_TYPES.length; i += 3) {
    const rowTypes = TICKET_TYPES.slice(i, i + 3);
    const row = new ActionRowBuilder().addComponents(
      rowTypes.map(t => new ButtonBuilder()
        .setCustomId(`ticket_${t.id}`)
        .setLabel(t.label)
        .setEmoji(t.emoji)
        .setStyle(t.style)
      )
    );
    rows.push(row);
  }

  await channel.send({ embeds: [embed], components: rows });
  await message.reply('Ticket panel created!');
}
