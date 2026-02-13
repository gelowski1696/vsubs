FROM node:20-bullseye AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-bullseye AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bullseye AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003
ENV DATABASE_URL=file:/data/subman.db

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/docs ./docs
COPY docker/entrypoint.sh /entrypoint.sh

RUN mkdir -p /data /app/storage /app/docs \
  && chmod +x /entrypoint.sh \
  && chown -R node:node /app /data

USER node
EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD sh -c 'node -e "const p=process.env.PORT||\"3003\";fetch(`http://127.0.0.1:${p}/health`).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"'

ENTRYPOINT ["/entrypoint.sh"]
