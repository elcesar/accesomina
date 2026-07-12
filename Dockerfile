FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --chown=node:node . .
ENV NODE_ENV=production
USER node
EXPOSE 8088
CMD ["sh", "-c", "pnpm run migrate && pnpm run seed:admin && pnpm start"]
