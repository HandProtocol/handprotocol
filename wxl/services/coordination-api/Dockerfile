FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY services/coordination-api ./services/coordination-api
RUN npm run build:api

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/services/coordination-api/dist ./dist
USER node
EXPOSE 8787
CMD ["node", "dist/server.js"]
