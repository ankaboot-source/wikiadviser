#!/bin/bash

################# Load .env file ###########
if [ -f .env ]; then
    source .env
fi
################# VARS #####################
ulimit -n 9999

curl -s "https://en.wikipedia.org/wiki/Special:Version" > ./version_page.html
MW_VERSION=${MW_VERSION:-$(grep -oP 'MediaWiki\s\d+\.\d+\.\d+(-wmf\.\d+)?' version_page.html | head -n1 | awk '{print $2}')}

MW_PROJECT_DIR=${MW_PROJECT_DIR:-"mediawiki"}
MW_PORT=${MW_PORT:-"8080"}
APACHE_LOG_DIR="/var/log/apache2"

CONF_DIR="../" # Wikiadviser root folder

# Convert space-separated string to array
LANGUAGES=($LANGUAGES)
DB_HOST=$DB_HOST

LANG_ARRAY=("${LANGUAGES[@]:-en}") # Languages of your wiki instances.

MW_SECRET_KEY=$(openssl rand -hex 32)
MW_UPGRADE_KEY=$(openssl rand -hex 8)

REQUIRED_RESOURCES=("./LocalSettings.php" "./wiki-site.conf" "./ports.conf" "../assets" "../MyVisualEditor")
##############################################

# This function is common in the first install and upgrade process.
common_setup() {
    echo "Install Additional extensions"
    echo ""
    #PageForms
    for ln in "${LANG_ARRAY[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/PageForms.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/PageForms
    done
    #ExternalData
    for ln in "${LANG_ARRAY[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/ExternalData.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/ExternalData
    done
    #RegularToolTips
    for ln in "${LANG_ARRAY[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/RegularTooltips.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/RegularTooltips
    done
    #HTMLTags
    for ln in "${LANG_ARRAY[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/HTMLTags.git /var/www/${MW_PROJECT_DIR}/wiki/$ln/extensions/HTMLTags
    done

    CURRENT_DIR="$(pwd)" # save current directory

    for ln in "${LANG_ARRAY[@]}"; do
        cd /var/www/${MW_PROJECT_DIR}/wiki/$ln || exit
        echo "Mediawiki Submodule update (${ln} wiki)..."
        git submodule update --init --recursive # update extensions,skins...
        composer update --no-dev
        cd extensions/TemplateStyles && composer update --no-dev && cd ../..
    done

    for ln in "${LANG_ARRAY[@]}"; do
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


########################################### INSTALL ##############################################################
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

apt -y update && apt -y upgrade

# Perl & Ploticus (required for EasyTimeline extension)
apt install -y perl
apt install -y ploticus
apt install -y fonts-freefont-ttf
apt install -y ffmpeg # required for TimedMediaHandler

# Apache2 setup
mv /etc/apache2/ports.conf /etc/apache2/ports.conf.old
MW_PORT="$MW_PORT" envsubst < ./ports.conf | tee /etc/apache2/ports.conf > /dev/null
APACHE_LOG_DIR="$APACHE_LOG_DIR" MW_PORT="$MW_PORT" MW_PROJECT_DIR="$MW_PROJECT_DIR" envsubst < ./wiki-site.conf | tee /etc/apache2/sites-available/wiki-site.conf > /dev/null
a2ensite wiki-site.conf

# PHP
apt install -y php libapache2-mod-php php-mbstring php-mysql php-xml php-cli php-intl

# composer
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Mediawiki Setup
echo "Creating /var/www/${MW_PROJECT_DIR}..."
mkdir -p "/var/www/${MW_PROJECT_DIR}"
chown $USER:$USER /var/www/${MW_PROJECT_DIR}

set -e
for ln in "${LANG_ARRAY[@]}"; do
    echo "Install [$ln] mediawiki version ${MW_VERSION}"
    sleep 2
    git clone https://gerrit.wikimedia.org/r/mediawiki/core.git --branch wmf/$MW_VERSION /var/www/${MW_PROJECT_DIR}/wiki/$ln
done
set +e

# Change permissions to images folder
for ln in "${LANG_ARRAY[@]}"; do
    mkdir /var/www/${MW_PROJECT_DIR}/wiki/"$ln"/images/timeline
    chown -R www-data:www-data /var/www/${MW_PROJECT_DIR}/wiki/"$ln"/images
done

# Copy wikiadviser resources into mediawiki
for ln in "${LANG_ARRAY[@]}"; do
    cp -r ${CONF_DIR}/assets/*  "/var/www/${MW_PROJECT_DIR}/wiki/"$ln"/resources/assets"
    cp -r ${CONF_DIR}/MyVisualEditor  "/var/www/${MW_PROJECT_DIR}/wiki/"$ln"/extensions"
done

for ln in "${LANG_ARRAY[@]}"; do
    DB_NAME="DB_NAME_${ln}"
    DB_USER="DB_USER_${ln}"
    DB_PASS="DB_PASS_${ln}"

    SERVER_ENDPOINT="http://localhost:${MW_PORT}" URL_PATH="/wiki/${ln}" DB_HOST=${DB_HOST} LANGUAGE="${ln}" DB_NAME="${!DB_NAME}" DB_USER="${!DB_USER}" DB_PASS="${!DB_PASS}" MW_SECRET_KEY="${MW_SECRET_KEY}" MW_UPGRADE_KEY="${MW_UPGRADE_KEY}"  envsubst '$SERVER_ENDPOINT $URL_PATH $DB_HOST $LANGUAGE $DB_NAME $DB_USER $DB_PASS $MW_SECRET_KEY $MW_UPGRADE_KEY' < ./LocalSettings.php > /var/www/${MW_PROJECT_DIR}/wiki/${ln}/LocalSettings.php

    echo "[$ln] DB Name: ${!DB_NAME}" >> /wikiadviser/mediawiki-setup/MW_CREDENTIALS.txt
    echo "[$ln] DB User: ${!DB_USER}" >> /wikiadviser/mediawiki-setup/MW_CREDENTIALS.txt
    echo "[$ln] DB Password: ${!DB_PASS}" >> /wikiadviser/mediawiki-setup/MW_CREDENTIALS.txt
done

# Call common_setup
common_setup

echo  "Remove unnecessary files"
rm ./version_page.html
