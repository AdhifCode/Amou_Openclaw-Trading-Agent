const winston = require("winston");
const path = require("path");

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, agentId }) => {
    const agent = agentId ? `[${agentId}]` : "";
    return `${timestamp} ${level.toUpperCase()} ${agent}: ${message}${stack ? "\n" + stack : ""}`;
  }),
);

const createLogger = (agentId) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { agentId },
    transports: [
      // Console output (untuk development)
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), logFormat),
      }),

      // File untuk setiap agent
      new winston.transports.File({
        filename: path.join(__dirname, `../logs/agent-${agentId}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
      }),

      // File error terpisah
      new winston.transports.File({
        filename: path.join(__dirname, "../logs/error.log"),
        level: "error",
        maxsize: 5242880,
        maxFiles: 5,
      }),

      // Combined log
      new winston.transports.File({
        filename: path.join(__dirname, "../logs/combined.log"),
        maxsize: 5242880,
        maxFiles: 5,
      }),
    ],
  });
};

module.exports = { createLogger };
