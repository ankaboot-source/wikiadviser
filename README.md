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

### Mediawiki Installation
#### 1. Install and configuration (User-interactive)
```
git clone https://github.com/ankaboot-source/wikiadviser.git
cd wikiadviser/mediawiki-setup
tmux new -s mediawiki
bash mediawiki-setup.sh
```
  <details>
    <summary><b>💡 Tip: </b> Tmux is useful to stay connected even after disconnection and to run long-running tasks. </summary>

    tmux attach -t mediawiki (To re-attach the session) 

  </details>

#### 2. Create Mediawiki Bot
- To create the Bot user you need to login first:
  - [FR] Browse to http://localhost:8080/wiki/fr/index.php/Sp%C3%A9cial:Connexion
  - [EN] Browse to http://localhost:8080/wiki/en/index.php/Special:UserLogin
    
> [!NOTE]  
> Below are the login credentials (Must be updated before using in Prod)  
> - User: Admin
> - Password: admin#2025
    
- Create a Bot user by browsing to http://localhost:8080/wiki/(LANGUAGE)/index.php/Special:BotPasswords : Save the credentials to use them later.

> [!NOTE]
> Above is the basic setup for a minimal working Mediawiki, More advanced setup in this [README](https://github.com/ankaboot-source/wikiadviser/blob/main/mediawiki-setup/MEDIAWIKI_SETUP.md?plain=1).
      
### Wikiadviser Installation

After installing Docker and Node.js, install the required system dependencies

1. Install Supabase dependencies

 ```sh
 cd wikiadviser
 npm install -g pnpm
 pnpm i
 ```

2. Start Supabase

  ```sh
  pnpx supabase start > supabase.log
  ```

  <details>
    <summary><b>💡 Tip: </b> If you get permission denied problem related to Docker run these commands (allows Docker to run without sudo) </summary>

    sudo usermod -aG docker $USER
    newgrp docker

  </details>
  
3. Auto-generate .env files (Include pre-configured Supabase variables)

```sh
./wikiadviser-setup.sh supabase.log
```
  > [!NOTE]
  > You must update the following variables within the auto-generated .env files
  > ```yml
  > # These variables are found in ./wikiadviser/supabase/functions/.env
  > # Use the bot you created in the first steps!
  > MW_BOT_USERNAME=your-secret-bot-username
  > MW_BOT_PASSWORD=your-secret-bot-password
  > ```

4. Start Supabase functions

  ```sh
  npm run dev:supabase-functions
  ```

5. Start WikiAdviser

   - Docker approach:

     ```sh
     docker compose -f docker-compose.dev.yml up -d
     ```

     > **Note:**  
     > To rebuild WikiAdviser, run:
     > ```sh
     > docker compose -f docker-compose.dev.yml up --build --force-recreate -d
     > ```


  
    - <details>
        <summary>Dev approach:</summary>
        
        <h6>Finish installing project dependencies</h6>
        
        ```sh
        npm run install-deps:frontend
        ```
        
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
