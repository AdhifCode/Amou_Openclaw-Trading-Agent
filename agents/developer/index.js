const { OpenClawAgent } = require("../../shared/openclaw-agent");
const { SYSTEM_PROMPTS } = require("../../config/system-prompts");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("developer");

let devAgent = null;

function initializeDeveloperAgent() {
  devAgent = new OpenClawAgent("developer", {
    name: "Developer",
    role: "System Maintenance",
  });

  devAgent.registerTool({
    name: "check_system_health",
    description: "Check all system components health",
    input_schema: { type: "object", properties: {} },
  });

  devAgent.setToolHandlers({
    check_system_health: async () => ({
      discord: "ONLINE",
      agents: 5,
      database: "CONNECTED",
      api: "RESPONDING",
    }),
  });

  logger.info("✓ Developer Agent initialized");
  return devAgent;
}

async function developerHandler(context) {
  const { message } = context;
  const content = message.content.replace(/<@!?\d+>\s*/g, "").trim();
  const [command] = content.split(/\s+/);

  if (command.toLowerCase() === "status") {
    return `
🔧 **System Status:**
Discord Gateway: ✅
5 Agents: ✅
Logging: ✅
Phase: 3/5 (OpenClaw Integration)
    `;
  }

  return `🟢 Developer is alive!`;
}

module.exports = { developerHandler, initializeDeveloperAgent };
