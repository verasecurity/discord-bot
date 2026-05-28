import { PermissionFlagsBits } from 'discord.js';

export async function purge(message, args) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return message.reply('You need Manage Messages permission.');
  }

  const amount = parseInt(args[0]);
  if (!amount || amount < 1 || amount > 100) {
    return message.reply('Provide a number between 1 and 100.');
  }

  const messages = await message.channel.bulkDelete(amount, true);
  const reply = await message.channel.send(`Deleted ${messages.size} messages.`);
  setTimeout(() => reply.delete().catch(() => {}), 3000);
}
