FROM oven/bun:1.3.10 AS deps

WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/character-cli/package.json apps/character-cli/package.json
COPY apps/studio/package.json apps/studio/package.json
COPY infra/db/package.json infra/db/package.json
COPY packages/engine-contracts/package.json packages/engine-contracts/package.json
COPY packages/engine-transparent-character/package.json packages/engine-transparent-character/package.json
COPY packages/engine-voxl-humanoid-skin/package.json packages/engine-voxl-humanoid-skin/package.json
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.10 AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5741

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/server ./apps/server
COPY packages ./packages
COPY characters ./characters

USER bun
EXPOSE 5741
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:5741/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["bun", "run", "--cwd", "apps/server", "start"]
