import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

const AVATAR_URL = 'https://media.discordapp.net/attachments/1509922749399695582/1509950779744714863/giss.JPG';
const BIO_TEXT = 'i am made by Chris and managed by his Web Panel';

export async function setavatarCommand(message) {
  if (message.author.id !== message.guild.ownerId) {
    return message.reply('Only the server owner can change the bot avatar.');
  }

  await message.reply('Updating bot profile...');

  try {
    const response = await fetch(AVATAR_URL);
    const buffer = Buffer.from(await response.arrayBuffer());
    await message.client.user.setAvatar(buffer);
    await message.client.rest.patch('/users/@me', { body: { bio: BIO_TEXT } });
    await message.channel.send('Bot avatar and bio updated!');
  } catch {
    await message.channel.send('Failed to update bot profile.');
  }
}
