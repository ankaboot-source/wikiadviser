[![DeepSource](https://app.deepsource.com/gh/ankaboot-source/wikiadviser.svg/?label=code+coverage&show_trend=true&token=ZTDAa-DQcTJvNvMiXJlquOHn)](https://app.deepsource.com/gh/ankaboot-source/wikiadviser/)

<div>
  <div align="center">
    <img width="90" height="90" src="https://github.com/ankaboot-source/wikiadviser/raw/main/docs/assets/icons/logo%20with%20background.svg" alt="WikiAdviser Logo">
  </div>
  <h1 align="center">WikiAdviser</h1>
  <div align="center">
    <p>
    Write, edit, and review articles together in real time
    </p>
  </div>
</div>

## 📑 Table of Contents
- [🤔 What is WikiAdviser?](#-what-is-wikiadviser)
- [🛠️ Setting Up](#️-setting-up)
- [🤝 Contributing](#-contributing)
- [🔧 Support](#-support)
- [📜 License](#-license)

## 🤔 What is WikiAdviser?

**WikiAdviser** is a **real-time** **collaborative** platform built on **MediaWiki**, designed for seamless article **writing**, **editing**, and **reviewing**. It enables multiple users to work together efficiently, ensuring high-quality content through instant feedback and structured revisions.

To give it a try without the hassle of installation, [simply use wikiadviser.io](https://app.wikiadviser.io/). For development purposes, jump to [🛠️ Setting Up](#️-setting-up).

## 🛠️ Setting Up

### Pre-requisites

- [Setup MediaWiki locally](/mediawiki-setup/MEDIAWIKI_SETUP.md)
- [Install Docker](https://docs.docker.com/engine/install)
- [Install NodeJS](https://nodejs.org)

### Setup

#### Installing Dependencies

After installing Docker and Node.js, install the required system dependencies

1. Starting with playwright

   ```sh
   sudo npx playwright install-deps
   ```

2. Then install project dependencies

   ```sh
   npm run install-deps
   ```

3. And finally we need to start Supabase

   ```sh
   npx supabase start
   ```

#### Enviroment Variables

On starting Supabase, you will get these Supabase credentials, some of which will be used later in `.env` files.

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

Copy `.env.example` in frontend and supabase/functions to `.env` and update the missing variables accordingly.

```env
SUPABASE_PROJECT_URL={your_supabase_api_url}
SUPABASE_SECRET_PROJECT_TOKEN={your_supabase_service_role_key}
...
```

### Run

And finally, start frontend and supabase-functions servers by running this command

```sh
npm run dev:all
```

Or if you want to run them separately

```sh
# to start the supabase-functions
npm run dev:supabase-functions

# to start the frontend
npm run dev:frontend
```

## 🤝 Contributing

Thank you for taking the time to contribute! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and more information on how to get started.

## 🔧 Support

If you encounter any issues, please check the [issues tab](https://github.com/ankaboot-source/wikiadviser/issues) to see if it has already been reported and resolved. Ensure that you are using the latest version before reporting an issue. If the problem persists, feel free to [open a new issue](https://github.com/ankaboot-source/wikiadviser/issues/new).

Please note that this app is provided for free and without any guarantee or official support. If you require additional assistance, you can contact [ankaboot professional services](mailto:contact@ankaboot.fr) for help.

## 📜 License

This software is [dual-licensed](DUAL-LICENSE.md) under [GNU AGPL v3](LICENSE).
