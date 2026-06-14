/**
 * Discord bot configuration untuk 5 agent
 * Setiap bot memiliki token & intent unik
 */

const DISCORD_INTENTS = [
  "Guilds", // Bot bisa akses guild/server info
  "GuildMembers", // Bot bisa lihat member list
  "GuildMessages", // Bot bisa baca pesan di guild
  "DirectMessages", // Bot bisa terima DM
  "MessageContent", // ⭐ CRITICAL: Bot bisa baca isi pesan (mention detection)
  "GuildPresences", // Optional: bot bisa lihat status member
];

const AGENTS_CONFIG = {
  analyst: {
    name: "Analyst",
    token: process.env.DISCORD_BOT_TOKEN_ANALYST,
    clientId: process.env.DISCORD_CLIENT_ID_ANALYST,
    intents: DISCORD_INTENTS,
    role: "analyst",
    color: 0x3498db, // Biru
    description: "Technical & fundamental analysis agent",
  },

  strategist: {
    name: "Strategist",
    token: process.env.DISCORD_BOT_TOKEN_STRATEGIST,
    clientId: process.env.DISCORD_CLIENT_ID_STRATEGIST,
    intents: DISCORD_INTENTS,
    role: "strategist",
    color: 0x2ecc71, // Hijau
    description: "Strategy formulation agent",
  },

  executor: {
    name: "Executor",
    token: process.env.DISCORD_BOT_TOKEN_EXECUTOR,
    clientId: process.env.DISCORD_CLIENT_ID_EXECUTOR,
    intents: DISCORD_INTENTS,
    role: "executor",
    color: 0xe74c3c, // Merah (karena punya API key!)
    description: "Order execution agent - HAS BINANCE API ACCESS",
  },

  monitor: {
    name: "Monitor",
    token: process.env.DISCORD_BOT_TOKEN_MONITOR,
    clientId: process.env.DISCORD_CLIENT_ID_MONITOR,
    intents: DISCORD_INTENTS,
    role: "monitor",
    color: 0xf39c12, // Orange
    description: "PnL & order monitoring agent",
  },

  developer: {
    name: "Developer",
    token: process.env.DISCORD_BOT_TOKEN_DEVELOPER,
    clientId: process.env.DISCORD_CLIENT_ID_DEVELOPER,
    intents: DISCORD_INTENTS,
    role: "developer",
    color: 0x9b59b6, // Purple
    description: "System maintenance & debugging agent",
  },
};

const GUILD_ID = process.env.DISCORD_GUILD_ID;

module.exports = {
  DISCORD_INTENTS,
  AGENTS_CONFIG,
  GUILD_ID,
};
