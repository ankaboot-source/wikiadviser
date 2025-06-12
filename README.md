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

### Installation

After installing Docker and Node.js, install the required system dependencies

1. Install Supabase dependencies

 ```sh
 npm install -g pnpm
 pnpm i
 ```

2. Start Supabase

  ```sh
  pnpx supabase start
  ```

  <details>
    <summary><b>💡 Tip: </b> If you get permission denied problem related to Docker run these commands (allows Docker to run without sudo) </summary>

    sudo usermod -aG docker $USER
    newgrp docker

  </details>
  
  > [!NOTE]
  > On starting Supabase, you will get these Supabase credentials, some of which will be used later in `.env` files.
  > ```yml
  > API URL: { your_api_url }
  > GraphQL URL: { your_graphql_url }
  > DB URL: { your_db_url }
  > Studio URL: { your_studio_url }
  > Inbucket URL: { your_studio_url }
  > JWT secret: { your_secret_jwt }
  > anon key: { your_anon_key }
  > service_role key: { your_service_role_key }
  > ```

1. Start Supabase functions

  > Copy `.env.example` (in `./wikiadviser/supabase/functions` folder) to `.env` and update the missing variables accordingly.

  ```sh
  npm run dev:supabase-functions
  ```

4. Start WikiAdviser
    - Docker approach:
      > Copy `.env.example.docker` (in `./wikiadviser` folder) to `.env` and update the missing variables accordingly.
      ```sh
      docker compose -f docker-compose.dev.yml up --build --force-recreate -d
      ```
  
    - <details>
        <summary>Dev approach:</summary>
        
        Finish installing project dependencies
        
        ```sh
        npm run install-deps:frontend
        ```
        
        > Copy `.env.example` (in `./wikiadviser/frontend` folder) to `.env` and update the missing variables accordingly.
        
        Start the frontend:
        ```sh
        npm run dev:frontend
        ```
      </details>



## 🤝 Contributing

Thank you for taking the time to contribute! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and more information on how to get started.

## 🔧 Support

If you encounter any issues, please check the [issues tab](https://github.com/ankaboot-source/wikiadviser/issues) to see if it has already been reported and resolved. Ensure that you are using the latest version before reporting an issue. If the problem persists, feel free to [open a new issue](https://github.com/ankaboot-source/wikiadviser/issues/new).

Please NOTE that this app is provided for free and without any guarantee or official support. If you require additional assistance, you can contact [ankaboot professional services](mailto:contact@ankaboot.fr) for help.

## 📜 License

This software is [dual-licensed](DUAL-LICENSE.md) under [GNU AGPL v3](LICENSE).
