#!/bin/sh
# A script that sets up mediawiki multi-environment instances
# This script is for first test on a local machine where we suppose we have 6 different LocalSettings.php file
# you should be logged in as root user to run this script with no problems

export DEBIAN_FRONTEND=noninteractive
environments=("dev" "demo" "prod")
user="wiki-user"

############Add new languages down below (DB related)##############
languages=("en" "fr")
en_databases=("dev_wiki_en" "demo_wiki_en" "prod_wiki_en")
fr_databases=("dev_wiki_fr" "demo_wiki_fr" "prod_wiki_fr")
en_users=("$en_db_dev_user" "$en_db_demo_user" "$en_db_prod_user")
fr_users=("$fr_db_dev_user" "$fr_db_demo_user" "$fr_db_prod_user")
en_passwords=("$en_db_dev_pwd" "$en_db_demo_pwd" "$en_db_prod_pwd")
fr_passwords=("$fr_db_dev_pwd" "$fr_db_demo_pwd" "$fr_db_prod_pwd")
###################################################################

# Installation
apt update && apt upgrade
# Apache2
apt install -y apache2
systemctl enable apache2
systemctl start apache2

# PHP
apt install -y php libapache2-mod-php php-mbstring php-mysql php-xml

# Database #recommended MySQL/Mariadb
apt install -y mariadb-server

# Setup DB
# Script equivalent of mysql_secure_installation
mysql -u root <<-EOF
UPDATE mysql.user SET Password=PASSWORD('$MARIADB_ROOT_PWD') WHERE User='root';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.db WHERE Db='test' OR Db='test_%';
FLUSH PRIVILEGES;
EOF

systemctl enable mariadb
systemctl start mariadb

for ((i=0; i<${#en_databases[@]}; i++)) ;
do
    for lang in "${languages[@]}"; do
        db_name="${lang}_databases[i]"
        eval db_name=\${$db_name}
        user_name="${lang}_users[i]"
        eval user_name=\${$user_name}
        user_pwd="${lang}_passwords[i]"
        eval user_pwd=\${$user_pwd}

        mariadb -u root -e "CREATE DATABASE $db_name;"
        mariadb -u root -e "CREATE USER '$user_name'@'localhost' IDENTIFIED BY '$user_pwd';"
        mariadb -u root -e "GRANT ALL PRIVILEGES ON $db_name.* TO '$user_name'@'localhost' WITH GRANT OPTION;"
   done
done

# Import database dumps
for ((i=0; i<${#en_databases[@]}; i++))
do
    for lang in "${languages[@]}"; do
        db_name="${lang}_databases[i]"
        eval db_name=\${$db_name}
        mariadb -u root  -e "use $db_name; source /home/'$user'/directory/$lang-wiki-dump.sql"
    done
done

# Install Mediawiki source code
for environment in "${environments[@]}"; do
    mkdir -p "/var/www/wiki-$environment"
done

curl -O https://releases.wikimedia.org/mediawiki/1.40/mediawiki-1.40.1.tar.gz
tar -xf mediawiki-1.40.1.tar.gz

for environment in "${environments[@]}"; do
    cp -r mediawiki-1.40.1 /var/www/wiki-$environment/en
    cp -r mediawiki-1.40.1 /var/www/wiki-$environment/fr
done

for environment in "${environments[@]}"; do
    cp LocalSettings_"$environment"_en.php /var/www/wiki-$environment/en
    cp LocalSettings_"$environment"_fr.php /var/www/wiki-$environment/fr
done

# Install extensions
# MyVisualEditor
for environment in "${environments[@]}"; do
    cp -r /home/$user/wikiadviser/MyVisualEditor /var/www/wiki-$environment/en/extensions/
    cp -r /home/$user/wikiadviser/MyVisualEditor /var/www/wiki-$environment/fr/extensions/
done

# PageForms
wget  https://github.com/wikimedia/mediawiki-extensions-PageForms/archive/5.6.3.zip
for environment in "${environments[@]}"; do
    unzip 5.6.3.zip -d /var/www/wiki-$environment/en/extensions/
    unzip 5.6.3.zip -d /var/www/wiki-$environment/fr/extensions/
    mv /var/www/wiki-$environment/fr/extensions/mediawiki-extensions-PageForms-5.6.3/ /var/www/wiki-$environment/en/extensions/PageForms
    mv /var/www/wiki-$environment/fr/extensions/mediawiki-extensions-PageForms-5.6.3/ /var/www/wiki-$environment/fr/extensions/PageForms
done

# TemplateStyle
wget https://extdist.wmflabs.org/dist/extensions/TemplateStyles-REL1_40-9699f28.tar.gz
for environment in "${environments[@]}"; do
    tar -xzf TemplateStyles-REL1_40-9699f28.tar.gz -C /var/www/wiki-$environment/en/extensions/
    tar -xzf TemplateStyles-REL1_40-9699f28.tar.gz -C /var/www/wiki-$environment/fr/extensions/
done

# UniversalLanguageSelector
wget https://extdist.wmflabs.org/dist/extensions/UniversalLanguageSelector-REL1_40-51ea41a.tar.gz
for environment in "${environments[@]}"; do
    tar -xzf UniversalLanguageSelector-REL1_40-51ea41a.tar.gz -C /var/www/wiki-$environment/en/extensions/
    tar -xzf UniversalLanguageSelector-REL1_40-51ea41a.tar.gz -C /var/www/wiki-$environment/fr/extensions/
done

# Wikibase
wget https://extdist.wmflabs.org/dist/extensions/Wikibase-REL1_40-4e1296d.tar.gz
for environment in "${environments[@]}"; do
    tar -xzf Wikibase-REL1_40-4e1296d.tar.gz -C /var/www/wiki-$environment/en/extensions/
    tar -xzf Wikibase-REL1_40-4e1296d.tar.gz -C /var/www/wiki-$environment/fr/extensions/
done

for environment in "${environments[@]}"; do
    cd /var/www/wiki-$environment/en/
    mv composer.local.json-sample composer.local.json
    composer install --no-dev
    php maintenance/run.php ./maintenance/update.php
    php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
    php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
    php maintenance/run.php ./maintenance/populateInterwiki.php
done

for environment in "${environments[@]}"; do
    cd /var/www/wiki-$environment/fr/
    mv composer.local.json-sample composer.local.json
    composer install --no-dev
    php maintenance/run.php ./maintenance/update.php
    php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
    php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
    php maintenance/run.php ./maintenance/populateInterwiki.php
done

# Apache2 setup
mv /etc/apache2/ports.conf /etc/apache2/ports.conf.old
cp ports.conf /etc/apache/ports.conf
for environment in "${environments[@]}"; do
    cp wiki-$environment /etc/apache2/sites-available/wiki-$environment.conf
    a2ensite wiki-$environment.conf
done
systemctl reload apache2 && systemctl restart apache2

# Caddy Setup
cp Caddyfile /etc/caddy/Caddyfile
cp robots.txt /etc/caddy/robots.txt
systemctl restart caddy