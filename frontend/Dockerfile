FROM node:lts-alpine as build-stage
WORKDIR /wikiadviser-frontend
COPY . .

ARG SERVER_ENDPOINT
ARG SUPABASE_PROJECT_URL
ARG SUPABASE_SECRET_PROJECT_TOKEN

ENV SERVER_ENDPOINT
ENV SUPABASE_PROJECT_URL ${SUPABASE_PROJECT_URL}
ENV SUPABASE_SECRET_PROJECT_TOKEN ${SUPABASE_SECRET_PROJECT_TOKEN}

RUN npm install && npm run build

FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /frontend/dist/spa /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]