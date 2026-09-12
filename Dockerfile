FROM node:22-alpine
WORKDIR /app
RUN corepack enable

COPY --chown=node:node package.json pnpm-lock.yaml ./
USER node
RUN pnpm install --prod --frozen-lockfile

COPY --chown=node:node . .
ENV NODE_ENV=production
EXPOSE 8088
CMD ["sh", "-c", "pnpm run migrate && pnpm start"]
