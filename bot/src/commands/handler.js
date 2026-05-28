import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { ping } from './ping.js';
import { warn } from './warn.js';
import { kick } from './kick.js';
import { ban } from './ban.js';
import { purge } from './purge.js';
import { mute, unmute } from './mute.js';
import { role } from './role.js';
import { roleall } from './roleall.js';
import { removerole } from './removerole.js';
import { lock } from './lock.js';
import { unlock } from './unlock.js';
import { slowmode } from './slowmode.js';
import { ticket, add, remove, close } from './ticket.js';
import { filterCommand } from './filter.js';
import { handleCustomCommand } from './custom.js';
import { getGuildConfig } from '../db.js';

const builtInCommands = {
  ping: { run: ping, description: 'Check bot latency', usage: 'ping' },
  warn: { run: warn, description: 'Warn a user', usage: 'warn @user <reason>' },
  kick: { run: kick, description: 'Kick a user', usage: 'kick @user <reason>' },
  ban: { run: ban, description: 'Ban a user', usage: 'ban @user <reason>' },
  purge: { run: purge, description: 'Delete messages', usage: 'purge <count>' },
  mute: { run: mute, description: 'Mute a user', usage: 'mute @user <duration> <reason>' },
  unmute: { run: unmute, description: 'Unmute a user', usage: 'unmute @user' },
  role: { run: role, description: 'Add a role to a user', usage: 'role @user @role' },
  roleall: { run: roleall, description: 'Add a role to all members', usage: 'roleall @role' },
  removerole: { run: removerole, description: 'Remove a role from a user', usage: 'removerole @user @role' },
  lock: { run: lock, description: 'Lock the current channel', usage: 'lock' },
  unlock: { run: unlock, description: 'Unlock the current channel', usage: 'unlock' },
  slowmode: { run: slowmode, description: 'Set channel slowmode', usage: 'slowmode <seconds|off>' },
  ticket: { run: ticket, description: 'Create a support ticket', usage: 'ticket' },
  add: { run: add, description: 'Add a user to ticket', usage: 'add @user' },
  remove: { run: remove, description: 'Remove a user from ticket', usage: 'remove @user' },
  close: { run: close, description: 'Close the current ticket', usage: 'close' },
  filter: { run: filterCommand, description: 'Manage the word filter', usage: 'filter <add|remove|list|toggle>' },
  help: { run: helpCommand, description: 'Show this help', usage: 'help [command]' },
  cmds: { run: helpCommand, description: 'List all commands', usage: 'cmds' },
};

export async function handleCommand(message, commandName, args, prefix) {
  if (builtInCommands[commandName]) {
    await builtInCommands[commandName].run(message, args, prefix);
    return;
  }

  const handled = await handleCustomCommand(message, commandName, args);
  if (!handled) {
    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setDescription(`Unknown command. Try \`${prefix}help\``);
    await message.reply({ embeds: [embed] }).catch(() => {});
  }
}

async function helpCommand(message, args, prefix) {
  const config = getGuildConfig(message.guild.id);
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Commands')
    .setDescription(`Prefix: \`${config.prefix}\``);

  for (const [name, cmd] of Object.entries(builtInCommands)) {
    embed.addFields({ name: `${prefix}${cmd.usage}`, value: cmd.description, inline: false });
  }

  await message.reply({ embeds: [embed] });
}
