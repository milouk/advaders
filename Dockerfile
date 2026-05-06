FROM node:22-alpine

WORKDIR /app

COPY server.js ./
COPY public ./public

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:${PORT}/api/config > /dev/null || exit 1

CMD ["node", "server.js"]
