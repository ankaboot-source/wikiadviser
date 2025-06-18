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

To give it a try without the hassle of installation, [simply use wikiadviser.io](https://app.wikiadviser.io/).
To run it locally, jump to [🛠️ Setting Up](#️-setting-up).
For development purposes, read [CONTRIBUTING.md](CONTRIBUTING.md).

## 🛠️ Setting Up

### Pre-requisites

- Clone the repository
- [Install Docker](https://docs.docker.com/engine/install) <details><summary><b>💡 Tip: </b>We recommend to run Docker as user, so don't forget to add your user to docker group these commands: </summary>
   sudo usermod -aG docker $USER
   newgrp docker
</details>

- [Install NodeJS](https://nodejs.org)

### WikiAdviser installation

1. Install and configure MediaWiki (User-interactive)
```
git clone https://github.com/ankaboot-source/wikiadviser.git
cd wikiadviser/mediawiki-setup
bash mediawiki-setup.sh
```

2. Start Supabase and auto-generate .env files
```sh
cd ..
npx supabase start > supabase.log
./wikiadviser-setup.sh supabase.log
```

3. Start WikiAdviser
```sh
npm run dev:supabase-functions
docker compose -f docker-compose.dev.yml up -d
```

## 🤝 Contributing

Thank you for taking the time to contribute! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and more information on how to get started.

## 🔧 Support

If you encounter any issues, please check the [issues tab](https://github.com/ankaboot-source/wikiadviser/issues) to see if it has already been reported and resolved. Ensure that you are using the latest version before reporting an issue. If the problem persists, feel free to [open a new issue](https://github.com/ankaboot-source/wikiadviser/issues/new).

Please NOTE that this app is provided for free and without any guarantee or official support. If you require additional assistance, you can contact [ankaboot professional services](mailto:contact@ankaboot.fr) for help.

## 📜 License

This software is [dual-licensed](DUAL-LICENSE.md) under [GNU AGPL v3](LICENSE).
