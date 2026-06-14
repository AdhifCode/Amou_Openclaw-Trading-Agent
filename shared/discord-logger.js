const { EmbedBuilder } = require("discord.js");
const { createLogger } = require("../utils/logger");

const logger = createLogger("discord-logger");

/**
 * DiscordLogger: Kirim logs ke Discord channels
 * Minimal version untuk Fase 2
 */
class DiscordLogger {
  constructor() {
    this.logChannelId = process.env.DISCORD_LOG_CHANNEL_ID;
    this.alertChannelId = process.env.DISCORD_ALERT_CHANNEL_ID;
    this.tradeLogChannelId = process.env.DISCORD_TRADE_LOG_CHANNEL_ID;

    this.discordClient = null;

    this.validateChannelIds();
  }

  validateChannelIds() {
    if (!this.logChannelId || !this.alertChannelId || !this.tradeLogChannelId) {
      logger.warn(
        "⚠️  One or more Discord channel IDs missing. Logging to Discord disabled.",
      );
      return false;
    }

    if (
      this.logChannelId.length !== 18 ||
      this.alertChannelId.length !== 18 ||
      this.tradeLogChannelId.length !== 18
    ) {
      logger.warn("⚠️  Channel IDs have invalid format (should be 18 digits)");
      return false;
    }

    logger.info("✓ Discord channel IDs validated");
    return true;
  }

  setDiscordClient(client) {
    this.discordClient = client;
    logger.info("✓ Discord client injected into logger");
  }

  async sendLog(title, message, agentId = "system", level = "info") {
    if (!this.discordClient) {
      logger.debug("Discord client not ready, skipping log send");
      return;
    }

    try {
      const channel = await this.discordClient.channels.fetch(
        this.logChannelId,
      );

      if (!channel) {
        logger.warn(`Log channel not found: ${this.logChannelId}`);
        return;
      }

      const colorMap = {
        debug: 0x808080,
        info: 0x3498db,
        warn: 0xf39c12,
        error: 0xe74c3c,
      };

      const embed = new EmbedBuilder()
        .setTitle(`📝 ${title}`)
        .setDescription(message)
        .setColor(colorMap[level] || 0x3498db)
        .addFields(
          { name: "Agent", value: agentId, inline: true },
          { name: "Level", value: level.toUpperCase(), inline: true },
        )
        .setTimestamp()
        .setFooter({ text: "Trading System Logger" });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("Failed to send log to Discord", { error });
    }
  }

  async sendAlert(title, message, severity = "medium", data = {}) {
    if (!this.discordClient) return;

    try {
      const channel = await this.discordClient.channels.fetch(
        this.alertChannelId,
      );

      if (!channel) {
        logger.warn(`Alert channel not found: ${this.alertChannelId}`);
        return;
      }

      const severityMap = {
        low: { emoji: "🟢", color: 0x2ecc71 },
        medium: { emoji: "🟡", color: 0xf39c12 },
        high: { emoji: "🔴", color: 0xe74c3c },
        critical: { emoji: "🚨", color: 0x8b0000 },
      };

      const severityInfo = severityMap[severity] || severityMap["medium"];

      const embed = new EmbedBuilder()
        .setTitle(`${severityInfo.emoji} ALERT: ${title}`)
        .setDescription(message)
        .setColor(severityInfo.color)
        .addFields(
          { name: "Severity", value: severity.toUpperCase(), inline: true },
          { name: "Timestamp", value: new Date().toISOString(), inline: true },
        );

      if (Object.keys(data).length > 0) {
        embed.addField(
          "Additional Data",
          "```json\n" + JSON.stringify(data, null, 2) + "\n```",
        );
      }

      embed.setFooter({ text: "Trading System Alert" });

      await channel.send({ embeds: [embed] });

      if (severity === "critical") {
        await channel.send("@here ⚠️ CRITICAL ALERT ABOVE!");
      }
    } catch (error) {
      logger.error("Failed to send alert to Discord", { error });
    }
  }

  async sendTradeLog(action, pair, side, quantity, price, data = {}) {
    if (!this.discordClient) return;

    try {
      const channel = await this.discordClient.channels.fetch(
        this.tradeLogChannelId,
      );

      if (!channel) {
        logger.warn(`Trade log channel not found: ${this.tradeLogChannelId}`);
        return;
      }

      const color = side === "LONG" || side === "BUY" ? 0x2ecc71 : 0xe74c3c;

      const embed = new EmbedBuilder()
        .setTitle(`💰 ${action.toUpperCase()}: ${pair}`)
        .setColor(color)
        .addFields(
          { name: "Pair", value: pair, inline: true },
          { name: "Side", value: side, inline: true },
          { name: "Quantity", value: quantity.toString(), inline: true },
          { name: "Price", value: `$${price.toFixed(2)}`, inline: true },
          {
            name: "Total Value",
            value: `$${(quantity * price).toFixed(2)}`,
            inline: true,
          },
        );

      if (data.orderId) {
        embed.addField("Order ID", data.orderId, true);
      }
      if (data.pnl !== undefined) {
        const pnlColor = data.pnl >= 0 ? "✅" : "❌";
        embed.addField("PnL", `${pnlColor} $${data.pnl.toFixed(2)}`, true);
      }

      embed.setTimestamp();
      embed.setFooter({ text: "Trading System" });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("Failed to send trade log to Discord", { error });
    }
  }
}

// Singleton
let instance = null;

function getDiscordLogger() {
  if (!instance) {
    instance = new DiscordLogger();
  }
  return instance;
}

module.exports = {
  DiscordLogger,
  getDiscordLogger,
};
