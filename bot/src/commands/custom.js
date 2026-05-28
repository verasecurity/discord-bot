import { getCommandByTrigger, getGuildConfig } from '../db.js';

export async function handleCustomCommand(message, commandName, args) {
  const cmd = getCommandByTrigger(message.guild.id, commandName);
  if (!cmd) return false;

  if (cmd.type === 'text') {
    let response = cmd.response;
    response = response.replace(/{user}/g, message.author.toString());
    response = response.replace(/{username}/g, message.author.username);
    response = response.replace(/{server}/g, message.guild.name);
    response = response.replace(/{channel}/g, message.channel.toString());
    response = response.replace(/{args}/g, args.join(' '));
    await message.reply(response);
  }

  return true;
}
