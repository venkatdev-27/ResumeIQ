FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install only required packages for puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copy only package files first (better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy only required app files
COPY . .

# Remove unnecessary files if present
RUN rm -rf .git node_modules/.cache

EXPOSE 10000

CMD ["node", "server.js"]
