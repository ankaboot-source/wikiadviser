FROM node:lts-alpine as build-stage
WORKDIR /wikiadviser-frontend
COPY . .

ARG SUPABASE_PROJECT_URL
ARG SUPABASE_SECRET_PROJECT_TOKEN
ARG WIKIADVISER_API_HOST 
ARG MW_SITE_SERVER 

ENV SUPABASE_PROJECT_URL ${SUPABASE_PROJECT_URL}
ENV SUPABASE_SECRET_PROJECT_TOKEN ${SUPABASE_SECRET_PROJECT_TOKEN}
ENV WIKIADVISER_API_HOST ${WIKIADVISER_API_HOST}
ENV MW_SITE_SERVER ${MW_SITE_SERVER}

RUN npm install && npm run build

FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /wikiadviser-frontend/dist/spa /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]