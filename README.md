[![DeepSource](https://app.deepsource.com/gh/ankaboot-source/wikiadviser.svg/?label=code+coverage&show_trend=true&token=ZTDAa-DQcTJvNvMiXJlquOHn)](https://app.deepsource.com/gh/ankaboot-source/wikiadviser/)

<div>
  <div align="center">
    <img width="90" height="90" src="https://github.com/ankaboot-source/wikiadviser/raw/762-ready-to-opensource/docs/assets/icons/logo%20with%20background.svg" alt="WikiAdviser Logo">
  </div>
  <h1 align="center">WikiAdviser</h1>
  <div align="center">
    <p>
    Collaborative MediaWiki editing platform
    </p>
  </div>
</div>

## 📑 Table of Contents

- [📑 Table of Contents](#-table-of-contents)
- [🤔 Why WikiAdviser?](#-why-wikiadviser)
- [👀 How can I use it?](#-how-can-i-use-it)
- [🛠️ Setting Up a Development Environment](#️-setting-up-a-development-environment)
  - [Pre-requisites](#pre-requisites)
  - [Setup](#setup)
    - [Installing Dependencies](#installing-dependencies)
    - [Enviroment Variables](#enviroment-variables)
  - [Run](#run)
- [🤝 Contributing](#-contributing)
- [🎯 Roadmap](#-roadmap)
- [🔧 Support](#-support)
- [📚 Learn more](#-learn-more)
- [📜 License](#-license)

## 🤔 Why WikiAdviser?

**WikiAdviser** is an **User-friendly** platform that helps in the **content creation** of MediaWiki articles as it **facilitates** the **communication** and the **collaboration** of experienced editors and non-experienced users.

## 👀 How can I use it?

To give it a try without the hassle of installation, [simply use wikiadviser.io](https://app.wikiadviser.io/). For development purposes, jump directly to [Running with Supabase locally](#running-with-supabase-locally).

## 🛠️ Setting Up a Development Environment

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

Copy `.env.example` in frontend and backend to `.env` and update the missing variables accordingly.

```env
SUPABASE_PROJECT_URL={your_supabase_api_url}
SUPABASE_SECRET_PROJECT_TOKEN={your_supabase_service_role_key}
...
```

### Run

And finally, start frontend and backend servers by running this command

```sh
npm run dev:all
```

Or if you want to run them separately

```sh
# to start the backend
npm run dev:backend

# to start the frontend
npm run dev:frontend
```

## 🤝 Contributing

Thank you for taking the time to contribute! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and more information on how to get started.

## 🎯 Roadmap

For any specific requests or suggestions regarding the roadmap, please feel free to contact [ankaboot professional services](mailto:contact@ankaboot.fr) or check the open issues for ongoing discussions and updates.

## 🔧 Support

If you encounter any issues, please check the [issues tab](https://github.com/ankaboot-source/wikiadviser/issues) to see if it has already been reported and resolved. Ensure that you are using the latest version before reporting an issue. If the problem persists, feel free to [open a new issue](https://github.com/ankaboot-source/wikiadviser/issues/new).

Please note that this app is provided for free and without any guarantee or official support. If you require additional assistance, you can contact [ankaboot professional services](mailto:contact@ankaboot.fr) for help.

## 📚 Learn more

Refer to [documentation's folder](./docs/) and [notes](./docs/NOTES.md).

## 📜 License

This software is [dual-licensed](DUAL-LICENSE.md) under [GNU AGPL v3](LICENSE).
