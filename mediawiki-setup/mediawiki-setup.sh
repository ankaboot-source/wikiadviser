#!/bin/sh
# A script that sets up mediawiki instance
# IF YOU WANT TO USE THIS SCRIPT TO INSTALL MULTI-ENV MEDIAWIKI INSTANCES (DEV, QA, PROD...) 
# JUST UPDATE THE VARIABLE MW_PROJECT_DIR="mediawiki" TO YOUR DESIRED ENVIRONMENT (e.g. MW_PROJECT_DIR="mediawiki-dev") AND RE-EXECUTE THE SCRIPT

###################################################################
###############################VARS################################
ulimit -n 9999

curl -s "https://en.wikipedia.org/wiki/Special:Version" > ./version_page.html
MW_VERSION=$(grep -oP 'MediaWiki\s\d+\.\d+\.\d+(-wmf\.\d+)?' version_page.html | head -n1 | awk '{print $2}')

MW_PROJECT_DIR="mediawiki" 
MW_PORT="8080"


CONF_DIR="$HOME/wikiadviser"
LANGUAGES=("en" "fr")
MW_SECRET_KEY=$(openssl rand -hex 32)
MW_UPGRADE_KEY=$(openssl rand -hex 8)

mw_init_dump_fr="https://rcsxuyoogygnyjbwbrbb.supabase.co/storage/v1/object/sign/mediawiki-init/init-dump-fr.sql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZWRpYXdpa2ktaW5pdC9pbml0LWR1bXAtZnIuc3FsIiwiaWF0IjoxNzQwNzM0MjA2LCJleHAiOjQ4NjI3OTgyMDZ9.Q5bEpxsrWFP0KF-rVJXmt4zK3ypU-1qmpIAislLx9bs"
mw_init_dump_en="https://rcsxuyoogygnyjbwbrbb.supabase.co/storage/v1/object/sign/mediawiki-init/init-dump-en.sql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZWRpYXdpa2ktaW5pdC9pbml0LWR1bXAtZW4uc3FsIiwiaWF0IjoxNzQwNzM0MTgzLCJleHAiOjQ4NjI3OTgxODN9.2Fw1v-5jTrPSDSxpavIUS3E45jZL8UjNoGlMbLOwHOg"

###################################################################
############# Installation #############################
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
sudo MW_PORT="$MW_PORT" envsubst < ./ports.conf > /etc/apache2/ports.conf
sudo MW_PORT="$MW_PORT" MW_PROJECT_DIR="$MW_PROJECT_DIR" envsubst '$MW_PORT $MW_PROJECT_DIR' < ./wiki-site.conf > /etc/apache2/sites-available/wiki-site.conf
sudo a2ensite wiki-site.conf
sudo systemctl enable apache2 && sudo systemctl restart apache2

# PHP
sudo apt install -y php libapache2-mod-php php-mbstring php-mysql php-xml

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
    DB_USER=${DB_NAME:-wiki_${ln}_user}
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
sudo mariadb_secure_installation

# Mediawiki Setup
# Install Mediawiki source code
echo "Creating /var/www/${MW_PROJECT_DIR}..."
echo ""
sudo mkdir -p "/var/www/${MW_PROJECT_DIR}"
sudo chown $USER:$USER /var/www/${MW_PROJECT_DIR}
echo ""

echo -e "Install mediawiki version ${MW_VERSION}"
for ln in "${LANGUAGES[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/core.git --branch wmf/$MW_VERSION /var/www/${MW_PROJECT_DIR}/wiki/$ln
done

sleep 2

echo "Install Additional extensions"
echo ""
# PageForms
for ln in "${LANGUAGES[@]}"; do
         git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/PageForms.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/PageForms
done
# ExternalData
for ln in "${LANGUAGES[@]}"; do
         git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/ExternalData /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/ExternalData
done
# RegularToolTips
for ln in "${LANGUAGES[@]}"; do
         git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/RegularTooltips.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/RegularTooltips

done
# HTMLTags
for ln in "${LANGUAGES[@]}"; do
         git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/HTMLTags.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/HTMLTags
done

for ln in "${LANGUAGES[@]}"; do
    cd /var/www/${MW_PROJECT_DIR}/wiki/$ln
    echo "Mediawiki Submodule update (${ln} wiki)..."
    git submodule update --init --recursive # update extensions,skins...
    composer update --no-dev
done

for ln in "${LANGUAGES[@]}"; do
    mkdir /var/www/${MW_PROJECT_DIR}/wiki/"$ln"/images/timeline
    chown -R www-data:www-data /var/www/${MW_PROJECT_DIR}/wiki/"$ln"/images
done

# Copy wikiadviser resources into mediawiki
for ln in "${LANGUAGES[@]}"; do
        cp -r "${CONF_DIR}/docs/assets/*"  "/var/www/${MW_PROJECT_DIR}/"$ln"/resources/assets"
        cp -r "${CONF_DIR}/MyVisualEditor"  "/var/www/${MW_PROJECT_DIR}/wiki/"$ln"/extensions"
done

for ln in "${LANGUAGES[@]}"; do
    SERVER_ENDPOINT="http://localhost:${MW_PORT}" URL_PATH="/wiki/${ln}" LANGUAGE="${ln}" DB_NAME="${DB_NAME}" DB_USER="${DB_USER}" DB_PASS="${DB_PASS}" MW_SECRET_KEY="${MW_SECRET_KEY}" MW_UPGRADE_KEY="${MW_UPGRADE_KEY}"  envsubst '$SERVER_ENDPOINT $URL_PATH $LANGUAGE $DB_NAME $DB_USER $DB_PASS $MW_SECRET_KEY $MW_UPGRADE_KEY' < ./LocalSettings.php > ./LocalSettings_"$ln".php
    cp $CONF_DIR/mediawiki-setup/LocalSettings_"$ln".php /var/www/${MW_PROJECT_DIR}/wiki/"$ln"/LocalSettings.php
done

# Setup Wikibase

for ln in "${LANGUAGES[@]}"; do
        cd /var/www/${MW_PROJECT_DIR}/wiki/$ln/
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
