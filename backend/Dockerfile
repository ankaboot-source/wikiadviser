# Build
FROM node:lts-alpine as build-stage
WORKDIR /wikiadviser-backend
COPY package*.json .
COPY tsconfig*.json .
COPY src .
RUN npm install && npm run build

# Run
FROM mcr.microsoft.com/playwright:v1.36.0-jammy as app-stage
WORKDIR /app
COPY package*.json .
RUN npm install --omit=dev && \
    npx playwright install --with-deps chromium
COPY --from=build-stage /wikiadviser-backend/dist .

EXPOSE 3000

CMD ["node", "app.js"]
