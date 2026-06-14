const { Client, ChannelType, REST, Routes } = require("discord.js");
const { createLogger } = require("../utils/logger");
const { validateEnvironment } = require("../utils/env-validator");
const { AGENTS_CONFIG, GUILD_ID } = require("../config/discord.config");

const logger = createLogger("gateway");

/**
 * DiscordGateway: Centralized routing untuk semua 5 bot
 * Setiap bot berbagi logic yang sama, hanya beda token & identity
 */
class DiscordGateway {
  constructor() {
    this.clients = new Map(); // Map<agentId, Client>
    this.agentHandlers = new Map(); // Map<agentId, handler>
    this.messageQueue = []; // Queue untuk debounce multiple agent triggers
  }

  /**
   * Initialize all 5 bot clients
   */
  async initialize() {
    logger.info("🚀 Initializing Discord Gateway with 5 agents...");

    try {
      for (const [agentId, config] of Object.entries(AGENTS_CONFIG)) {
        logger.info(`  → Initializing ${config.name} bot...`);

        const client = new Client({
          intents: config.intents,
        });

        // Setup event listeners
        this.setupClientEvents(client, agentId, config);

        // Login dengan token
        await client.login(config.token);

        this.clients.set(agentId, client);
        logger.info(
          `  ✅ ${config.name} bot logged in (ID: ${client.user.id})`,
        );
      }

      logger.info("✅ All 5 agents initialized successfully!");
      return true;
    } catch (error) {
      logger.error("❌ Failed to initialize Discord Gateway", { error });
      throw error;
    }
  }

  /**
   * Setup event listeners untuk setiap bot client
   */
  setupClientEvents(client, agentId, config) {
    const agentLogger = createLogger(agentId);

    // Event: Bot ready
    client.on("ready", () => {
      agentLogger.info(`🟢 Ready! Logged in as @${client.user.tag}`);
      client.user.setStatus("online");
      client.user.setActivity(`@${config.name}`, { type: "WATCHING" });
    });

    // Event: Pesan masuk
    client.on("messageCreate", async (message) => {
      // Skip jika pesan dari bot itu sendiri atau bot lain
      if (message.author.bot) return;

      // Skip jika bukan di guild yang ditargetkan
      if (message.guildId !== GUILD_ID) return;

      // Log semua incoming message
      agentLogger.debug(
        `Message from @${message.author.tag}: "${message.content}"`,
      );

      // Cek apakah bot ini di-mention
      const isMentioned = message.mentions.has(client.user.id);

      if (!isMentioned) {
        // Bot tidak di-mention, ignore
        agentLogger.debug(`Not mentioned, skipping`);
        return;
      }

      // Bot di-mention! Route ke handler
      agentLogger.info(`📥 Mentioned! Processing message...`);

      try {
        // Tampilkan typing indicator
        await message.channel.sendTyping();

        // Route ke agent handler
        const handler = this.agentHandlers.get(agentId);
        if (!handler) {
          throw new Error(`No handler registered for agent: ${agentId}`);
        }

        // Panggil handler dengan context lengkap
        const response = await handler({
          message,
          agentId,
          config,
          client,
          logger: agentLogger,
        });

        // Send response
        if (response) {
          await this.sendResponse(message, response, config);
        }
      } catch (error) {
        agentLogger.error(`❌ Error processing message`, { error });
        await message.reply({
          content: `❌ Error: ${error.message}`,
          ephemeral: true,
        });
      }
    });

    // Event: Error handling
    client.on("error", (error) => {
      agentLogger.error("Discord client error", { error });
    });

    client.on("shardError", (error) => {
      agentLogger.error("Shard error", { error });
    });
  }

  /**
   * Register handler untuk setiap agent
   * Handler ini akan dipanggil ketika bot di-mention
   */
  registerAgentHandler(agentId, handler) {
    if (!AGENTS_CONFIG[agentId]) {
      throw new Error(`Unknown agent: ${agentId}`);
    }
    this.agentHandlers.set(agentId, handler);
    logger.info(`✓ Handler registered for ${AGENTS_CONFIG[agentId].name}`);
  }

  /**
   * Send response ke Discord dengan formatting
   */
  async sendResponse(message, response, config) {
    // Response bisa string atau object dengan structure
    const content =
      typeof response === "string"
        ? response
        : response.content || JSON.stringify(response);

    // Split jika content terlalu panjang (Discord max 2000 char per message)
    const MAX_LENGTH = 1900;
    if (content.length > MAX_LENGTH) {
      // Kirim sebagai file jika terlalu panjang
      const { AttachmentBuilder } = require("discord.js");
      const attachment = new AttachmentBuilder(Buffer.from(content), {
        name: `response-${Date.now()}.txt`,
      });

      await message.reply({
        content: `📄 Response terlalu panjang, dikirim sebagai file:`,
        files: [attachment],
      });
    } else {
      // Format response dengan embed
      const { EmbedBuilder } = require("discord.js");

      const embed = new EmbedBuilder()
        .setTitle(`${config.name} Response`)
        .setDescription(content)
        .setColor(config.color)
        .setTimestamp()
        .setFooter({
          text: `@${config.name}`,
          iconURL: message.client.user.displayAvatarURL(),
        });

      await message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false },
      });
    }
  }

  /**
   * Get specific client (untuk debugging atau direct access)
   */
  getClient(agentId) {
    const client = this.clients.get(agentId);
    if (!client) {
      throw new Error(`Client not found for agent: ${agentId}`);
    }
    return client;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info("🛑 Shutting down Discord Gateway...");

    for (const [agentId, client] of this.clients.entries()) {
      logger.info(`  → Logging out ${agentId}...`);
      await client.destroy();
    }

    logger.info("✅ Discord Gateway shutdown complete");
  }
}

module.exports = { DiscordGateway };
