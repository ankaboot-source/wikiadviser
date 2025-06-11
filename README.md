[![DeepSource](https://app.deepsource.com/gh/ankaboot-source/wikiadviser.svg/?label=code+coverage&show_trend=true&token=ZTDAa-DQcTJvNvMiXJlquOHn)](https://app.deepsource.com/gh/ankaboot-source/wikiadviser/)
[![Maintainability](https://qlty.sh/badges/612e2b1b-61ab-468f-a868-fc13e0ec47f1/maintainability.svg)](https://qlty.sh/gh/ankaboot-source/projects/wikiadviser)

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

- Clone the repository
- [Setup MediaWiki locally](/mediawiki-setup/MEDIAWIKI_SETUP.md)
- [Install Docker](https://docs.docker.com/engine/install)
- [Install NodeJS](https://nodejs.org)

### How to run?

1. Install project dependencies

   ```sh
   npm install -g pnpm
   pnpm i
   ```

2. And then we need to start Supabase

   ```sh
   pnpx supabase start
   ```
   If you get permission denied problem related to Docker run these commands (allow Docker to run without sudo)
   
   ```sh
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. Start Supabase functions

   ```sh
   npm run dev:supabase-functions
   ```
4. Start wikiadviser

   - Copy `.env.example.docker` (in ./wikiadviser folder) to `.env` and update the missing variables accordingly.
   - Start wikiadviser services:

   ```sh
   docker compose -f docker-compose.dev.yml up --build --force-recreate -d
   ```


<details>
  <summary><h2>Advanced Setup</h2></summary>
The advanced setup is intended for development and contribution. To run the app in development mode, follow these steps:

1. Install `pnpm` globally

    ```sh
    npm install -g pnpm
    ```

2. Install project dependencies

    ```sh
    npm run install-deps
    ```

3. And then we need to start Supabase

    ```sh
    pnpx supabase start
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

</details>


## 🤝 Contributing

Thank you for taking the time to contribute! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and more information on how to get started.

## 🔧 Support

If you encounter any issues, please check the [issues tab](https://github.com/ankaboot-source/wikiadviser/issues) to see if it has already been reported and resolved. Ensure that you are using the latest version before reporting an issue. If the problem persists, feel free to [open a new issue](https://github.com/ankaboot-source/wikiadviser/issues/new).

Please note that this app is provided for free and without any guarantee or official support. If you require additional assistance, you can contact [ankaboot professional services](mailto:contact@ankaboot.fr) for help.

## 📜 License

This software is [dual-licensed](DUAL-LICENSE.md) under [GNU AGPL v3](LICENSE).