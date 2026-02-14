FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install chromium for puppeteer
RUN apk add --no-cache chromium

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 10000

CMD ["node", "server.js"]
