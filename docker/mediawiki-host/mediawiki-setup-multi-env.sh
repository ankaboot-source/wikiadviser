#!/bin/bash

################# VARS #################### 
ulimit -n 9999

curl -s "https://en.wikipedia.org/wiki/Special:Version" > ./version_page.html
MW_VERSION=$(grep -oP 'MediaWiki\s\d+\.\d+\.\d+(-wmf\.\d+)?' version_page.html | head -n1 | awk '{print $2}')
MARIADB_VERSION="11.4" # Our Dumps exported from v11.4 mariadb server, you could have issues when importing dumps in older versions, it's recommended to install v11.4 and newer.

MW_PROJECT_DIR=("dev" "demo" "prod")
MW_PORT=("8080" "8081" "8082")
APACHE_LOG_DIR="/var/log/apache2"

LANGUAGES=("en" "fr") # Languages of your wiki instances.

DUMP_PATH="./dump"

MW_SECRET_KEY=$(openssl rand -hex 32)
MW_UPGRADE_KEY=$(openssl rand -hex 8)

mw_init_dump_fr="https://rcsxuyoogygnyjbwbrbb.supabase.co/storage/v1/object/sign/mediawiki-init/init-dump-fr.sql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZWRpYXdpa2ktaW5pdC9pbml0LWR1bXAtZnIuc3FsIiwiaWF0IjoxNzQwNzM0MjA2LCJleHAiOjQ4NjI3OTgyMDZ9.Q5bEpxsrWFP0KF-rVJXmt4zK3ypU-1qmpIAislLx9bs"
mw_init_dump_en="https://rcsxuyoogygnyjbwbrbb.supabase.co/storage/v1/object/sign/mediawiki-init/init-dump-en.sql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZWRpYXdpa2ktaW5pdC9pbml0LWR1bXAtZW4uc3FsIiwiaWF0IjoxNzQwNzM0MTgzLCJleHAiOjQ4NjI3OTgxODN9.2Fw1v-5jTrPSDSxpavIUS3E45jZL8UjNoGlMbLOwHOg"

REQUIRED_RESOURCES=("../conf/LocalSettings.php" "../conf/wiki-site.conf" "../resources/assets" "../resources/extensions/MyVisualEditor")
##############################################

# This function is common in the first install and upgrade process.
common_setup() {
    echo "Install Additional extensions"
    echo ""
    #PageForms
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/PageForms.git /var/www/$env/wiki/$ln/extensions/PageForms
        done
    done
    #ExternalData
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/ExternalData.git /var/www/$env/wiki/$ln/extensions/ExternalData
        done
    done
    #RegularToolTips
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/RegularTooltips.git /var/www/$env/wiki/$ln/extensions/RegularTooltips
        done
    done
    #HTMLTags
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/HTMLTags.git /var/www/$env/wiki/$ln/extensions/HTMLTags
        done
    done
    CURRENT_DIR="$(pwd)" # save current directory

    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            cd /var/www/$env/wiki/$ln || exit
            echo "Mediawiki Submodule update (${ln} wiki)..."
            git submodule update --init --recursive # update extensions,skins...
            composer update --no-dev
            cd extensions/TemplateStyles && composer update --no-dev && cd ../..
        done
    done
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            cd /var/www/$env/wiki/$ln/ || exit
            mv composer.local.json-sample composer.local.json
            composer install --no-dev --no-interaction
            cd extensions/Wikibase && composer install --no-dev && cd ../..
            php maintenance/run.php ./maintenance/update.php
            php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
            php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
            php maintenance/run.php ./maintenance/populateInterwiki.php
        done
    done
    cd $CURRENT_DIR # return to original path

}
############################################ UPGRADE #########################################################
if [[ "$1" == "--upgrade" ]]; then
 
    if [[ "$(basename "$PWD")" != "mediawiki-host" ]]; then
        echo "Error: Please navigate to wikiadviser/mediawiki-docker/mediawiki-host before running the script."
        exit 1
    fi

    echo "Starting MediaWiki upgrade process..."

    check_job_queue() {
        local env=$1
        local ln=$2
        local result

        # Run the PHP script and capture the output
        
        result=$(sudo -S -u www-data bash -c "/usr/bin/php /var/www/$env/wiki/$ln/maintenance/runJobs.php")

        # Check if the result contains "Job queue is empty."
        if [[ "$result" == "Job queue is empty." ]]; then
            return 0
        else
            return 1
        fi
    }

    echo "Clearing Pending Jobs"
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            while true; do
                if check_job_queue $env "$ln"; then
                    echo "Job queue is empty for $env/$ln."
                    break
                else
                    echo "Running jobs for $env/$ln. Queue not empty, re-checking..."
                    # 5 sec sleep to avoid hammering the server
                    sleep 5
               fi
            done
        done
    done

    echo "Backing up old database dump folder"
    if [[ -d "$DUMP_PATH" ]]; then
        cp -r "$DUMP_PATH" "$DUMP_PATH-$(date +%Y%m%d-%H%M%S)"
    else
        mkdir -p "$DUMP_PATH"
    fi

    echo "Creating Database dumps"
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            read -p "Enter the database name for '${env}' '${ln}' wiki [If you used the default name ${env}_${ln} during init setup, you can Press Enter to continue]: " input_db_name
            input_db_name=${input_db_name:-${env}_${ln}}
            sudo -S mysqldump -u root $input_db_name > "$DUMP_PATH/dump-$env-$ln.sql"
        done
    done

    echo "Backing up old MediaWiki folders"
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            if [[ -d "/var/www/$env/wiki/$ln" ]]; then
                mv "/var/www/$env/wiki/$ln" "/var/www/$env/wiki/$ln.old"
            fi
        done
    done
    echo  "Downloading new MediaWiki package"
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            git clone "https://gerrit.wikimedia.org/r/mediawiki/core.git" --branch "wmf/$MW_VERSION" "/var/www/$env/wiki/$ln"
        done
    done
    echo "Upgrade process completed successfully."

    # Call common_setup
    common_setup 

    echo "Copy old configuration to the new installation directories"
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            cp /var/www/$env/wiki/$ln.old/LocalSettings.php /var/www/$env/wiki/$ln/LocalSettings.php
            cp -r /var/www/$env/wiki/$ln.old/images /var/www/$env/wiki/$ln
            cp -r /var/www/$env/wiki/$ln.old/resources/assets/icons /var/www/$env/wiki/$ln/resources/assets/icons
            cp /var/www/$env/wiki/$ln.old/resources/assets/poweredby_wikiadviser_*.png /var/www/$env/wiki/$ln/resources/assets/
            sudo chown -R www-data:www-data /var/www/$env/wiki/$ln/images
            cp -r "../resources/extensions/MyVisualEditor" "/var/www/$env/wiki/$ln/extensions"
        done
    done

    echo  "Remove unnecessary files"
    rm ./version_page.html

    echo "Restarting web server..."
    sudo systemctl restart apache2.service

else

########################################### INSTALL ##############################################################
 
    if [[ "$(basename "$PWD")" != "mediawiki-host" ]]; then
        echo "Error: Please navigate to wikiadviser/mediawiki-docker/mediawiki-host before running the script."
        exit 1
    fi

    # Check required resources
    for resource in "${REQUIRED_RESOURCES[@]}"; do
        if [ ! -e "$resource" ]; then
            echo "Error: '$resource' does not exist."
            exit 1
        fi
    done
    echo ""
    echo "All required resources exist. Continuing script..."
    echo ""
    sleep 2

    sudo apt -y update && sudo apt -y upgrade
    
    # Git
    sudo apt install git

    # Perl & Ploticus (required for EasyTimeline extension)
    sudo apt install -y perl
    sudo apt install -y ploticus
    sudo apt install -y fonts-freefont-ttf
    sudo apt install -y ffmpeg # required for TimedMediaHandler

    # Apache2
    sudo apt install -y apache2

    # Apache2 setup
    sudo mv /etc/apache2/ports.conf /etc/apache2/ports.conf.old
    
    # Configure ports apache will listen to 
    for port in "${MW_PORT[@]}"; do
        echo "Listen 127.0.0.1:${port}" | sudo tee -a /etc/apache2/ports.conf > /dev/null
    done
    
    # Configure apache sites serving mediawiki instances
    for i in "${!MW_PROJECT_DIR[@]}"; do
        SITE="${MW_PROJECT_DIR[$i]}"
        MW_PORT_VALUE="${MW_PORT[$i]}"
        APACHE_LOG_DIR="$APACHE_LOG_DIR" MW_PROJECT_DIR="$SITE" MW_PORT="$MW_PORT_VALUE" envsubst < ./wiki-site.conf | \
        sudo tee "/etc/apache2/sites-available/${SITE}.conf" > /dev/null
    done

    # Enable sites
    for site in "${MW_PROJECT_DIR[@]}"; do
        sudo a2ensite $site.conf
    done

    sudo systemctl enable apache2 && sudo systemctl restart apache2

    # PHP
    sudo apt install -y php libapache2-mod-php php-mbstring php-mysql php-xml php-cli php-intl

    # composer
    curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer

    # Database (recommended: MySQL/Mariadb)
    echo "Installing MariaDB..."
    echo ""
    curl -LsS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash -s -- --mariadb-server-version=${MARIADB_VERSION}
    sudo apt update
    sudo apt install -y mariadb-server
    echo ""
    sudo systemctl enable mariadb
    sudo systemctl start mariadb
    echo "DATABASE STARTED..."
    echo ""

    # Download mediawiki init dumps
    for ln in "${LANGUAGES[@]}"; do
        dump_file="mw_init_dump_${ln}"
        wget "${!dump_file}" -O ./init-dump-${ln}.sql
    done

    # Setup DB
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do

            var_prefix="${env}_${ln}"

            echo "Creating base for your '${env}' '${ln}'..."
            echo ""
            
            read -p "Enter the database name for '${env}' '${ln}' [default: ${env}_${ln}]: " input_db_name
            input_db_name=${input_db_name:-${env}_${ln}}
            declare "${var_prefix}_db_name=${input_db_name}" # assign input_db_name value to dynamic variable (env_ln_db_name) # will be used later within Localsettings.php

            read -p "Enter the database username for '${env}' '${ln}' [default: ${env}_${ln}_user]: " input_db_user
            input_db_user=${input_db_user:-${env}_${ln}_user}
            declare "${var_prefix}_db_user=${input_db_user}"
            
            read -s -p "Enter the database password for '${env}' '${ln}': " input_db_pass
            declare "${var_prefix}_db_pass=${input_db_pass}"

            echo ""
            sudo mariadb -u root -e "CREATE DATABASE ${input_db_name};"
            sudo mariadb -u root -e "CREATE USER '${input_db_user}'@'localhost' IDENTIFIED BY '${input_db_pass}';"
            sudo mariadb -u root -e "GRANT ALL PRIVILEGES ON ${input_db_name}.* TO '${input_db_user}'@'localhost' WITH GRANT OPTION;"
            sudo mariadb -u root -D ${input_db_name} < ./init-dump-${ln}.sql
            
            echo "'${env}' '${ln}' setup completed!"
        done
    done
    sleep 2

    # Secure database
    echo "Applying mariadb secure installation..."
    sudo mariadb-secure-installation

    # Mediawiki Setup
    for env in "${MW_PROJECT_DIR[@]}"; do
        echo "Creating /var/www/$env"
        echo ""
        sudo mkdir -p "/var/www/$env"
        echo ""
        sudo chown $USER:$USER /var/www/$env
    done
    
    echo -e "Installing mediawiki version ${MW_VERSION}..."

    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            git clone https://gerrit.wikimedia.org/r/mediawiki/core.git --branch wmf/$MW_VERSION /var/www/$env/wiki/$ln
        done
    done

    sleep 2

    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            mkdir /var/www/$env/wiki/"$ln"/images/timeline
            sudo chown -R www-data:www-data /var/www/$env/wiki/"$ln"/images
        done
    done

    # Copy wikiadviser resources into mediawiki
    for env in "${MW_PROJECT_DIR[@]}"; do
        for ln in "${LANGUAGES[@]}"; do
            cp -r ../resources/assets/*  "/var/www/$env/wiki/"$ln"/resources/assets"
            cp -r ../resources/extensions/MyVisualEditor  "/var/www/$env/wiki/"$ln"/extensions"
        done
    done

    for i in "${!MW_PROJECT_DIR[@]}"; do
        MW_ENV_VALUE="${MW_PROJECT_DIR[$i]}"
        MW_PORT_VALUE="${MW_PORT[$i]}"
        for ln in "${LANGUAGES[@]}"; do
            var_prefix="${MW_ENV_VALUE}_${ln}"
            DB_NAME="${var_prefix}_db_name"
            DB_USER="${var_prefix}_db_user"
            DB_PASS="${var_prefix}_db_pass"
            DB_HOST="localhost" SERVER_ENDPOINT="http://localhost:${MW_PORT_VALUE}" URL_PATH="/wiki/${ln}" LANGUAGE="${ln}" DB_NAME="${!DB_NAME}" DB_USER="${!DB_USER}" DB_PASS="${!DB_PASS}" MW_SECRET_KEY="${MW_SECRET_KEY}" MW_UPGRADE_KEY="${MW_UPGRADE_KEY}"  envsubst '$DB_HOST $SERVER_ENDPOINT $URL_PATH $LANGUAGE $DB_NAME $DB_USER $DB_PASS $MW_SECRET_KEY $MW_UPGRADE_KEY' < ./LocalSettings.php > /var/www/$MW_ENV_VALUE/wiki/$ln/LocalSettings.php
        done
    done

    # Call common_setup
    common_setup

    echo  "Remove unnecessary files"
    rm ./version_page.html

    echo "Restarting web server..."
    sudo systemctl restart apache2.service
fi
