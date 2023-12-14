# Wikiadviser

## MediaWiki

To set up MediaWiki locallay, you must follow these [steps](/mediawiki-setup/MEDIAWIKI_SETUP.md).

## Pre-requisites

- [Install Docker](https://docs.docker.com/engine/install)
- [Install NodeJS](https://nodejs.org)

## Setup the project

After installing Docker and NodeJS, we need to install the dependencies that the project requires from the system by running this command:

```sh
sudo npx playwright install-deps
```

and also install project dependencies by running this command:

```sh
npm run install-deps
```

When we finish installing dependencies, we need to start Supabase by running this command:

```sh
# If you want to use Supabase locally
sudo npx supabase start
# else
npx supabase start
```

After running this command, you get this result when shell finishes setup.

```yml
API URL: { your_api_url }
GraphQL URL: { your_graphql_url }
DB URL: { your_db_url }
Studio URL: { your_studio_url }
Inbucket URL: { your_studio_url }
JWT secret: { your_secret_jwt }
anon key: { your_anon_key }
service_role key: { your_service_role_key }
```

So you must save it on file because some of the Supabase credentials will be used later in `.env` files.

Copy `.env.example` in frontend and backend to `.env` and update the missing variables according to the file that we saved recently.

```env
SUPABASE_PROJECT_URL={your_supabase_api_url}
SUPABASE_SECRET_PROJECT_TOKEN={your_supabase_service_role_key}
...
```

## Running the Project

And finally, start frontend and backend servers by running this command.

```sh
# to start the backend
npm run dev:backend

# to start the frontend
npm run dev:frontend
```

## For more information

Refer to [documentation's folder](./docs/) and [notes](./docs/NOTES.md).
