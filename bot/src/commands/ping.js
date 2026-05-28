import { EmbedBuilder } from 'discord.js';

export async function ping(message) {
  const sent = await message.reply('Pinging...');
  const latency = sent.createdTimestamp - message.createdTimestamp;
  const apiLatency = Math.round(message.client.ws.ping);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Pong!')
    .addFields(
      { name: 'Bot Latency', value: `${latency}ms`, inline: true },
      { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
    );

  await sent.edit({ content: null, embeds: [embed] });
}
