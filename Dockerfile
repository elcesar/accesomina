FROM node:22-alpine AS frontend
WORKDIR /build/nexo-v2
RUN corepack enable
COPY nexo-v2/package.json nexo-v2/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY nexo-v2/ ./
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --chown=node:node . .
COPY --from=frontend --chown=node:node /build/nexo-v2/dist ./frontend-dist
ENV NODE_ENV=production
ENV FRONTEND_MODE=react
ENV FRONTEND_DIST_DIR=/app/frontend-dist
USER node
EXPOSE 8088
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:8088/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/scripts/start-container.js"]
