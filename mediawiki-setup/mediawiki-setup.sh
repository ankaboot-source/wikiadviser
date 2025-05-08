#!/bin/bash

################# VARS #################### 
ulimit -n 9999

curl -s "https://en.wikipedia.org/wiki/Special:Version" > ./version_page.html
MW_VERSION=$(grep -oP 'MediaWiki\s\d+\.\d+\.\d+(-wmf\.\d+)?' version_page.html | head -n1 | awk '{print $2}')
MARIADB_VERSION="11.4" # Our Dumps exported from v11.4 mariadb server, you could have issues when importing dumps in older versions, it's recommended to install v11.4 and newer.

MW_PROJECT_DIR="mediawiki"
MW_PORT="8080"

CONF_DIR="../" # Wikiadviser root folder
LANGUAGES=("en" "fr") # Languages of your wiki instances.

DUMP_PATH="./dump"

MW_SECRET_KEY=$(openssl rand -hex 32)
MW_UPGRADE_KEY=$(openssl rand -hex 8)

mw_init_dump_fr="https://rcsxuyoogygnyjbwbrbb.supabase.co/storage/v1/object/sign/mediawiki-init/init-dump-fr.sql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZWRpYXdpa2ktaW5pdC9pbml0LWR1bXAtZnIuc3FsIiwiaWF0IjoxNzQwNzM0MjA2LCJleHAiOjQ4NjI3OTgyMDZ9.Q5bEpxsrWFP0KF-rVJXmt4zK3ypU-1qmpIAislLx9bs"
mw_init_dump_en="https://rcsxuyoogygnyjbwbrbb.supabase.co/storage/v1/object/sign/mediawiki-init/init-dump-en.sql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZWRpYXdpa2ktaW5pdC9pbml0LWR1bXAtZW4uc3FsIiwiaWF0IjoxNzQwNzM0MTgzLCJleHAiOjQ4NjI3OTgxODN9.2Fw1v-5jTrPSDSxpavIUS3E45jZL8UjNoGlMbLOwHOg"
##############################################

# This function is common in the first install and upgrade process.
common_setup() {
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

    CURRENT_DIR="$(pwd)" # save current directory

    for ln in "${LANGUAGES[@]}"; do
        cd /var/www/${MW_PROJECT_DIR}/wiki/$ln || exit
        echo "Mediawiki Submodule update (${ln} wiki)..."
        git submodule update --init --recursive # update extensions,skins...
        composer update --no-dev
        cd extensions/TemplateStyles && composer update --no-dev && cd ../..
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

    cd $CURRENT_DIR # return to original path

}

################################### UPGRADE ########################################
if [[ "$1" == "--upgrade" ]]; then
    echo "Starting MediaWiki upgrade process..."

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

    echo "Clearing Pending Jobs"
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

    echo "Backing up old database dump folder"
    if [[ -d "$DUMP_PATH" ]]; then
        cp "$DUMP_PATH" "$DUMP_PATH-$(date +%Y%m%d-%H%M%S)"
    else 
        mkdir -p "$DUMP_PATH"
    fi
  

    echo "Creating Database dumps"
    for ln in "${LANGUAGES[@]}"; do
        read -p "Enter the database name for '${ln}' wiki [If you used the default name wiki_${ln} during init setup, you can Press Enter to continue]: " input_db_name
        input_db_name=${input_db_name:-"wiki_${ln}"}
        sudo -S mysqldump -u root $input_db_name > "$DUMP_PATH/dump-$ln.sql"
    done

    echo "Backing up old MediaWiki folders"
    for ln in "${LANGUAGES[@]}"; do
        if [[ -d "/var/www/${MW_PROJECT_DIR}/wiki/$ln" ]]; then
            mv "/var/www/${MW_PROJECT_DIR}/wiki/$ln" "/var/www/${MW_PROJECT_DIR}/wiki/$ln.old"
        fi
    done

    echo  "Downloading new MediaWiki package"
    for ln in "${LANGUAGES[@]}"; do
        git clone "https://gerrit.wikimedia.org/r/mediawiki/core.git" --branch "wmf/$MW_VERSION" "/var/www/${MW_PROJECT_DIR}/wiki/$ln"
    done

    echo "Upgrade process completed successfully."

    # Call common_setup
    common_setup 

    echo "Copy old configuration to the new installation directories"
    for ln in "${LANGUAGES[@]}"; do
        cp /var/www/${MW_PROJECT_DIR}/wiki/$ln.old/LocalSettings.php /var/www/${MW_PROJECT_DIR}/wiki/$ln/LocalSettings.php
        cp -r /var/www/${MW_PROJECT_DIR}/wiki/$ln.old/images /var/www/${MW_PROJECT_DIR}/wiki/$ln
        cp -r /var/www/${MW_PROJECT_DIR}/wiki/$ln.old/resources/assets/icons /var/www/${MW_PROJECT_DIR}/wiki/$ln/resources/assets/icons
        cp /var/www/${MW_PROJECT_DIR}/wiki/$ln.old/resources/assets/poweredby_wikiadviser_*.png /var/www/${MW_PROJECT_DIR}/wiki/$ln/resources/assets/
        sudo chown -R www-data:www-data /var/www/${MW_PROJECT_DIR}/wiki/$ln/images
        cp -r "${CONF_DIR}/MyVisualEditor" "/var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions"
    done
    
    echo  "Remove unnecessary files"
    rm ./version_page.html

    echo "Restarting web server..."
    sudo systemctl restart apache2.service

else

########################################### INSTALL ##############################################################

    sudo apt -y update && sudo apt -y upgrade

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
    MW_PORT="$MW_PORT" envsubst < ./ports.conf | sudo tee /etc/apache2/ports.conf > /dev/null
    MW_PORT="$MW_PORT" MW_PROJECT_DIR="$MW_PROJECT_DIR" envsubst < ./wiki-site.conf | sudo tee /etc/apache2/sites-available/wiki-site.conf > /dev/null
    sudo a2ensite wiki-site.conf
    sudo systemctl enable apache2 && sudo systemctl restart apache2

    # PHP
    sudo apt install -y php libapache2-mod-php php-mbstring php-mysql php-xml php-cli php-intl

    # composer
    curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer

    # Database #recommended MySQL/Mariadb
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
    for ln in "${LANGUAGES[@]}"; do

        var_prefix="${ln}"
  
        echo "Creating base for your '${ln}' Wiki..."
        echo ""

        read -p "Enter the database name for '${ln}' Wiki [default: wiki_${ln}]: " DB_NAME
        DB_NAME=${DB_NAME:-wiki_${ln}}
        declare "${var_prefix}_db_name=${DB_NAME}"

        read -p "Enter the database username for '${ln}' Wiki [default: wiki_${ln}_user]: " DB_USER
        DB_USER=${DB_USER:-wiki_${ln}_user}
        declare "${var_prefix}_db_user=${DB_USER}"

        read -s -p "Enter the database password for '${ln}' Wiki: " DB_PASS
        declare "${var_prefix}_db_name=${DB_PASS}"

        echo ""
        echo "Creating Databases..."
        sudo mariadb -u root -e "CREATE DATABASE ${DB_NAME};"
        sudo mariadb -u root -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
        sudo mariadb -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost' WITH GRANT OPTION;"
        echo "Importing Init Dumps..."
        sudo mariadb -u root -D ${DB_NAME} < ./init-dump-${ln}.sql

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

    for ln in "${LANGUAGES[@]}"; do
        mkdir /var/www/${MW_PROJECT_DIR}/wiki/"$ln"/images/timeline
        sudo chown -R www-data:www-data /var/www/${MW_PROJECT_DIR}/wiki/"$ln"/images
    done

    # Copy wikiadviser resources into mediawiki
    for ln in "${LANGUAGES[@]}"; do
        cp -r ${CONF_DIR}/docs/assets/*  "/var/www/${MW_PROJECT_DIR}/wiki/"$ln"/resources/assets"
        cp -r ${CONF_DIR}/MyVisualEditor  "/var/www/${MW_PROJECT_DIR}/wiki/"$ln"/extensions"
    done
    
    for ln in "${LANGUAGES[@]}"; do

        var_prefix="${ln}"

        DB_NAME="${var_prefix}_db_name"
        DB_USER="${var_prefix}_db_user"
        DB_PASS="${var_prefix}_db_pass"

        SERVER_ENDPOINT="http://localhost:${MW_PORT}" URL_PATH="/wiki/${ln}" LANGUAGE="${ln}" DB_NAME="${!DB_NAME}" DB_USER="${!DB_USER}" DB_PASS="${!DB_PASS}" MW_SECRET_KEY="${MW_SECRET_KEY}" MW_UPGRADE_KEY="${MW_UPGRADE_KEY}"  envsubst '$SERVER_ENDPOINT $URL_PATH $LANGUAGE $DB_NAME $DB_USER $DB_PASS $MW_SECRET_KEY $MW_UPGRADE_KEY' < ./LocalSettings.php > /var/www/${MW_PROJECT_DIR}/wiki/${ln}/LocalSettings.php
    done

    # Call common_setup
    common_setup

    echo  "Remove unnecessary files"
    rm ./version_page.html

    echo "Restarting web server..."
    sudo systemctl restart apache2.service
fi
