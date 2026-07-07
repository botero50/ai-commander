FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose API port
EXPOSE 3000

# CLI entry point
ENTRYPOINT ["node", "packages/cli/dist/cli.js"]
