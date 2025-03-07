#!/bin/bash

ulimit -n 9999

curl -s "https://en.wikipedia.org/wiki/Special:Version" > ./version_page.html
MW_VERSION=$(grep -oP 'MediaWiki\s\d+\.\d+\.\d+(-wmf\.\d+)?' version_page.html | head -n1 | awk '{print $2}')

MW_PROJECT_DIR="mediawiki"
MW_PORT="8080"

CONF_DIR="$HOME/wikiadviser"
LANGUAGES=("en" "fr")

DUMP_PATH="dump"


common_function() {
    echo "Install Additional extensions"
    echo ""
    #PageForms
    for ln in "${LANGUAGES[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/PageForms.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/PageForms
    done
    #ExternalData
    for ln in "${LANGUAGES[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/ExternalData.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/ExternalData
    done
    #RegularToolTips
    for ln in "${LANGUAGES[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/RegularTooltips.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/RegularTooltips
    done
    #HTMLTags
    for ln in "${LANGUAGES[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/HTMLTags.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/HTMLTags
    done


    for ln in "${LANGUAGES[@]}"; do
        cd /var/www/${MW_PROJECT_DIR}/wiki/$ln || exit
        echo "Mediawiki Submodule update (${ln} wiki)..."
        git submodule update --init --recursive # update extensions,skins...
        composer update --no-dev
    done

    echo -e "\e[1;35mCopy old configuration to the new installation directories\e[0m"
    for ln in "${LANGUAGES[@]}"; do
        cp /var/www/${MW_PROJECT_DIR}/wiki/$ln.old/LocalSettings.php /var/www/${MW_PROJECT_DIR}/wiki/$ln/LocalSettings.php
        cp -r /var/www/${MW_PROJECT_DIR}/wiki/$ln.old/images /var/www/${MW_PROJECT_DIR}/wiki/$ln
        cp -r /var/www/${MW_PROJECT_DIR}/wiki/$ln.old/resources/assets/icons /var/www/${MW_PROJECT_DIR}/wiki/$ln/resources/assets/icons
        cp /var/www/${MW_PROJECT_DIR}/wiki/$ln.old/resources/assets/poweredby_wikiadviser_*.png /var/www/${MW_PROJECT_DIR}/wiki/$ln/resources/assets/
        echo $mediawiki_password | sudo -S chown -R www-data:www-data /var/www/${MW_PROJECT_DIR}/wiki/$ln/images
        cp -r "${CONF_DIR}/MyVisualEditor" "/var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions"
    done
}


if [[ "$1" == "--upgrade" ]]; then
    echo -e "\e[1;35mStarting MediaWiki upgrade process...\e[0m"

    check_job_queue() {
        local lang=$1
        local result

        # Run the PHP script and capture the output
        result=$(sudo -S -u www-data bash -c "/usr/bin/php /var/www/${MW_PROJECT_DIR}/wiki/$lang/maintenance/runJobs.php")

        # Check if the result contains "Job queue is empty."
        if [[ "$result" == "Job queue is empty." ]]; then
            return 0
        else
            return 1
        fi
    }

    echo -e "\e[1;35mClearing Pending Jobs\e[0m"
    for ln in "${LANGUAGES[@]}"; do
        while true; do
            if check_job_queue "$ln"; then
                echo "Job queue is empty for $ln."
                break
            else
                echo "Running jobs for $ln. Queue not empty, re-checking..."
                # 5 sec sleep to avoid hammering the server
                sleep 5
            fi
        done
    done

    echo -e "\e[1;35mBacking up old database dump folder\e[0m"
    if [[ -d "/$DUMP_PATH" ]]; then
        mv "/$DUMP_PATH" "/$DUMP_PATH.old"
    fi
    mkdir -p "/$DUMP_PATH"

    echo -e "\e[1;35mCreating Database dumps\e[0m"
    for ln in "${LANGUAGES[@]}"; do
        sudo -S mysqldump -u root "wiki_$ln" > "/$DUMP_PATH/dump-$ln.sql"
    done

    echo -e "\e[1;35mBacking up old MediaWiki folders\e[0m"
    for ln in "${LANGUAGES[@]}"; do
        if [[ -d "/var/www/${MW_PROJECT_DIR}/wiki/$ln" ]]; then
            mv "/var/www/${MW_PROJECT_DIR}/wiki/$ln" "/var/www/${MW_PROJECT_DIR}/wiki/$ln.old"
        fi
    done

    echo -e "\e[1;35mDownloading new MediaWiki package\e[0m"
    for ln in "${LANGUAGES[@]}"; do
        git clone "https://gerrit.wikimedia.org/r/mediawiki/core.git" --branch "wmf/$MW_VERSION" "/var/www/${MW_PROJECT_DIR}/wiki/$ln"
    done

    echo -e "\e[1;32mUpgrade process completed successfully.\e[0m"

    #Call common_function
    common_function 

    # Setup Wikibase
    for ln in "${LANGUAGES[@]}"; do
        cd /var/www/${MW_PROJECT_DIR}/wiki/$ln/ || exit
         mv composer.local.json-sample composer.local.json
        composer install --no-dev --no-interaction
        cd extensions/Wikibase || exit
        composer install --no-dev && cd ../..
        php maintenance/run.php ./maintenance/update.php
        php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
        php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
        php maintenance/run.php ./maintenance/populateInterwiki.php
    done

    echo  "Remove unnecessary files"
    rm ./version_page.html

    echo "Restarting web server..."
    sudo systemctl restart apache2.service


else
    MW_SECRET_KEY=$(openssl rand -hex 32)
    MW_UPGRADE_KEY=$(openssl rand -hex 8)

    mw_init_dump_fr=""
    mw_init_dump_en=""

    ###################################################################
    ############# Installation #############################
    #sudo apt -y update && sudo apt -y upgrade

    # Perl & Ploticus (required for EasyTimeline extension)
    sudo apt install -y perl
    sudo apt install -y ploticus
    sudo apt install -y fonts-freefont-ttf
    sudo apt install -y ffmpeg # required for TimedMediaHandler
    sudo apt install -y php-curl # Required for EmbedVideo

    # Apache2
    sudo apt install -y apache2

    # Apache2 setup
    sudo mv /etc/apache2/ports.conf /etc/apache2/ports.conf.old
    sudo MW_PORT="$MW_PORT" envsubst < ./ports.conf > /etc/apache2/ports.conf
    sudo MW_PORT="$MW_PORT" MW_PROJECT_DIR="$MW_PROJECT_DIR" envsubst < ./wiki-site.conf > /etc/apache2/sites-available/wiki-site.conf
    sudo a2ensite wiki-site.conf
    sudo systemctl enable apache2 && sudo systemctl restart apache2

    # PHP
    sudo apt install -y php libapache2-mod-php php-mbstring php-mysql php-xml php-cli php-intl

    # composer
    curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer

    # Database #recommended MySQL/Mariadb
    echo "Installing MariaDB..."
    echo ""
    sudo apt install -y mariadb-server
    echo ""
    sudo systemctl enable mariadb
    sudo systemctl start mariadb
    echo "DATABASE STARTED..."
    echo ""

    # Setup DB
    for ln in "${LANGUAGES[@]}"; do
        echo "Creating base for your '${ln}' Wiki..."
        echo ""
        read -p "Enter the database name for '${ln}' Wiki [default: wiki_${ln}]: " DB_NAME
        DB_NAME=${DB_NAME:-wiki_${ln}}
        read -p "Enter the database username for '${ln}' Wiki [default: wiki_${ln}_user]: " DB_USER
        DB_USER=${DB_USER:-wiki_${ln}_user}
        read -s -p "Enter the database password for '${ln}' Wiki: " DB_PASS
        echo ""
        sudo mariadb -u root -e "CREATE DATABASE ${DB_NAME};"
        sudo mariadb -u root -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
        sudo mariadb -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost' WITH GRANT OPTION;"
        dump_file="mw_init_dump_${ln}"
        wget "${!dump_file}" -O ./init-dump-${ln}.sql
        sudo mariadb -u root -D ${DB_NAME} < ./init-dump-${ln}.sql
        rm -f ./init-dump-${ln}.sql
        echo "'${ln}' wiki setup completed!"
    done

    sleep 2

    # Secure database
    echo "Applying mariadb secure installation..."
    sudo mariadb-secure-installation

    # Mediawiki Setup
    echo "Creating /var/www/${MW_PROJECT_DIR}..."
    echo ""
    sudo mkdir -p "/var/www/${MW_PROJECT_DIR}"
    echo ""
    sudo chown $USER:$USER /var/www/${MW_PROJECT_DIR}
    echo -e "Install mediawiki version ${MW_VERSION}"
    for ln in "${LANGUAGES[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/core.git --branch wmf/$MW_VERSION /var/www/${MW_PROJECT_DIR}/wiki/$ln
    done

    sleep 2

    #call common-function
    common_function

    for ln in "${LANGUAGES[@]}"; do
        SERVER_ENDPOINT="http://localhost:${MW_PORT}" URL_PATH="/wiki/${ln}" LANGUAGE="${ln}" DB_NAME="${DB_NAME}" DB_USER="${DB_USER}" DB_PASS="${DB_PASS}" MW_SECRET_KEY="${MW_SECRET_KEY}" MW_UPGRADE_KEY="${MW_UPGRADE_KEY}"  envsubst '$SERVER_ENDPOINT $URL_PATH $LANGUAGE $DB_NAME $DB_USER $DB_PASS $MW_SECRET_KEY $MW_UPGRADE_KEY' < ./LocalSettings.php > /var/www/${MW_PROJECT_DIR}/wiki/${ln}/LocalSettings.php
    done

    for ln in "${LANGUAGES[@]}"; do
        cd /var/www/${MW_PROJECT_DIR}/wiki/$ln/ || exit
        mv composer.local.json-sample composer.local.json
        composer install --no-dev --no-interaction
        cd extensions/Wikibase && composer install --no-dev && cd ../..
        php maintenance/run.php ./maintenance/update.php
        php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
        php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
        php maintenance/run.php ./maintenance/populateInterwiki.php
    done

    echo  "Remove unnecessary files"
    rm ./version_page.html

    echo "Restarting web server..."
    sudo systemctl restart apache2.service
fi
