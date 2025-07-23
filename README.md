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
- [Install NodeJS](https://nodejs.org)
- [Install Docker](https://docs.docker.com/engine/install)

> [!TIP]
> To run the app without sudo, we recommend adding your user to the Docker group. Use the following commands:
>    ```sh
>    sudo usermod -aG docker $USER && newgrp docker
>    ```

### Installation

The whole process may take some time (up to 30 minutes). Please be patient.

```sh
git clone https://github.com/ankaboot-source/wikiadviser.git
cd wikiadviser/
./start.sh
```





## 🤝 Contributing

Thank you for taking the time to contribute! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and more information on how to get started.

If you're setting up the project for development, check out the 
[Install & Run WikiAdviser for development](CONTRIBUTING.md#install--run-wikiadviser-for-development) section.


## 🔧 Support

If you encounter any issues, please check the [issues tab](https://github.com/ankaboot-source/wikiadviser/issues) to see if it has already been reported and resolved. Ensure that you are using the latest version before reporting an issue. If the problem persists, feel free to [open a new issue](https://github.com/ankaboot-source/wikiadviser/issues/new).

Please NOTE that this app is provided for free and without any guarantee or official support. If you require additional assistance, you can contact [ankaboot professional services](mailto:contact@ankaboot.fr) for help.

## 📜 License

This software is [dual-licensed](DUAL-LICENSE.md) under [GNU AGPL v3](LICENSE).
