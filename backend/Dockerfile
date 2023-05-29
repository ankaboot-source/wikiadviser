# Build
FROM node:lts-alpine as build-stage
WORKDIR /wikiadviser-backend
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src
RUN npm install && npm run build

# Run
FROM node:lts-alpine as app-stage
WORKDIR /wikiadviser-backend
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build-stage /wikiadviser-backend/dist .

EXPOSE 3000

CMD ["node", "dist/app.js"]