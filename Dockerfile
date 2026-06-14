FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose webhook port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {let data='';r.on('data',d=>data+=d);r.on('end',()=>process.exit(JSON.parse(data).status==='ok'?0:1))})"

# Start application
CMD ["node", "shared/discord-gateway-main.js"]
