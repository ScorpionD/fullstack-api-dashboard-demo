FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared
USER node
EXPOSE 4100
CMD ["sh","-c","node server/migrate.mjs && node server/index.mjs"]
