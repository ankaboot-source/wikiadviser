# Wikiadviser

## Pre-requisites

- You need to have a running mediawiki instance. We recommend to use the canasta distribution for ease of configuration. You can follow [these steps](https://canasta.wiki/setup/#create-new-wiki) for a fast setup. You also need to have `MyVisualEditor` in the extensions folder of mediawiki (Either through a volume mount or a copy).

- You need to have a supabase instance (In the cloud or locally hosted):
  - If using a cloud instance, you need to run the migrations manually.
  * If you're planning on using the local version, you can just run `npm i` in the root folder of this repository and then `npx supabase start`.

## Run using docker

- Make sure you have setup all the necessary pre-requisits.
- Copy `.env.example` to `.env` and update the missing env variables accordingly.
- Start wikiadviser services:

```sh
docker-compose -f docker-compose.prod.yml -f docker-compose.dev.yml up --build --force-recreate -d
```
