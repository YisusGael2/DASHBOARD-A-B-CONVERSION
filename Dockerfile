FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then \
      NODE_EXTRA_CA_CERTS=/run/secrets/build_ca npm ci --fetch-retries=1 --fetch-timeout=20000; \
    else npm ci --fetch-retries=1 --fetch-timeout=20000; fi
COPY --chown=node:node . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3001
USER node
CMD ["npm", "start"]
