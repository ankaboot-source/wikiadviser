#!/bin/sh
# A script that sets up mediawiki multi-environment instances
# This script is for first test on a local machine where we suppose we have 6 different LocalSettings.php file
# you should be logged in as root user to run this script with no problems

###################################################################
###############################VARS################################

export DEBIAN_FRONTEND=noninteractive
environments=("dev" "demo" "prod")
project_dir=("wiki-dev" "wiki-demo" "wiki-prod")
dev_port="8081"
demo_port="8080"
prod_port="8082"
PRIVATE_IP="$PRIVATE_IP"
user="wiki-user"
CONF_DIR="/home/$user/wikiadviser/mediawiki-setup"
languages=$LANGUAGES #(Update the list in GitHub Secrets)
environments=$DATABASE_ENV
###################################################################
###################################################################

# Server Setup 
# User
adduser --disabled-password --home /home/$user --gecos "" $user
usermod -a -G sudo $user
echo "$user:$MEDIAWIKI_SUDO_PWD" | chpasswd

# Set SSH keys for root and $user
# Adding SSH to root user required to allow downloading wikiadviser repo within the server,
# keys will be removed in the next few lines.
mkdir -p /home/$user/.ssh
cp /root/.ssh/authorized_keys /home/$user/.ssh
# root
echo "$SSH_PUBLIC_MEDIAWIKI" > /root/.ssh/id_rsa.pub
echo "$SSH_PRIVATE_MEDIAWIKI" > /root/.ssh/id_rsa
echo "$SSH_KNOWN_HOSTS_MEDIAWIKI" > /root/.ssh/known_hosts
# $user
echo "$SSH_PUBLIC_MEDIAWIKI" > /home/$user/.ssh/id_rsa.pub
echo "$SSH_PRIVATE_MEDIAWIKI" > /home/$user/.ssh/id_rsa
echo "$SSH_KNOWN_HOSTS_MEDIAWIKI" > /home/$user/.ssh/known_hosts
cat /home/$user/.ssh/id_rsa.pub >> /home/$user/.ssh/authorized_keys #for github deploy
chmod 600 /home/$user/.ssh/id_rsa
chown -R $user:$user /home/$user/.ssh

############# Installation #############################
apt -y update && apt -y upgrade

# Wikiadviser GitHub Repo
git clone git@github.com:ankaboot-source/wikiadviser.git /home/$user/wikiadviser

# Remove SSH KEYS from root user
rm -rf /root/.ssh/id_rsa.pub
rm -rf /root/.ssh/id_rsa
rm -rf  /root/.ssh/known_hosts

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

for lang in "${languages[@]}"; do
do
    for env in "${environments[@]}"; do
        mariadb -u root -e "CREATE DATABASE "$lang"_wiki_"$env";"
        mariadb -u root -e "CREATE USER '"$lang"_wiki_"$env"'@'localhost' IDENTIFIED BY '"$lang"_wiki_"$env"';"
        mariadb -u root -e "GRANT ALL PRIVILEGES ON "$lang"_wiki_"$env".* TO '"$lang"_wiki_"$env"'@'localhost' WITH GRANT OPTION;"
   done
done

# Import database dumps
for lang in "${languages[@]}"; do
do
    for env in "${environments[@]}"; do
        mariadb -u root  -e "use "$lang"_wiki_"$env"; source /home/"$user"/directory/"$lang"-wiki-dump.sql"
    done
done

# Mediawiki Setup
# Install Mediawiki source code
for environment in "${environments[@]}"; do
    mkdir -p "/var/www/wiki-"$environment""
done

curl -O https://releases.wikimedia.org/mediawiki/1.40/mediawiki-1.40.1.tar.gz
tar -xf mediawiki-1.40.1.tar.gz

for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cp -r mediawiki-1.40.1 /var/www/wiki-"$environment"/"$lang"
    done
done

for envs in "${environments[@]}"; do

    for lang in "${languages[@]}"; do
        if [ "$envs" = "prod" ]
        then
             SERVER_ENDPOINT="https://wiki.wikiadviser.io" URL_PATH="/"$lang"" LANGUAGE="$lang" DB_NAME=""$envs"_wiki_"$lang"" DB_USER=""$envs"_wiki_"$lang"" DB_PASSWORD=""$envs"_wiki_"$lang""  envsubst '$SERVER_ENDPOINT $URL_PATH $LANGUAGE $DB_NAME $DB_USER $DB_PASSWORD' < LocalSettings.php > ./LocalSettings_prod_"$lang".php
        else
             SERVER_ENDPOINT="https://wiki-"$envs".wikiadviser.io" URL_PATH="/"$lang"" LANGUAGE="$lang" DB_NAME=""$envs"_wiki_"$lang"" DB_USER=""$envs"_wiki_"$lang"" DB_PASSWORD=""$envs"_wiki_"$lang""  envsubst '$SERVER_ENDPOINT $URL_PATH $LANGUAGE $DB_NAME $DB_USER $DB_PASSWORD' < LocalSettings.php > ./LocalSettings_"$envs"_"$lang".php
        fi
    done
done

for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cp $CONF_DIR/LocalSettings_"$environment"_"$lang".php /var/www/wiki-"$environment"/"$lang"
    done
done

# Extensions install
# MyVisualEditor
for environment in "${environments[@]}"; 
    for lang in "${languages[@]}"; do
        cp -r /home/$user/wikiadviser/MyVisualEditor /var/www/wiki-$environment/$lang/extensions/
    done
done

# PageForms
wget  https://github.com/wikimedia/mediawiki-extensions-PageForms/archive/5.6.3.zip
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        unzip 5.6.3.zip -d /var/www/wiki-$environment/$lang/extensions/
        mv /var/www/wiki-$environment/$lang/extensions/mediawiki-extensions-PageForms-5.6.3/ /var/www/wiki-$environment/$lang/extensions/PageForms
    done
done

# TemplateStyle
wget https://extdist.wmflabs.org/dist/extensions/TemplateStyles-REL1_40-9699f28.tar.gz
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        tar -xzf TemplateStyles-REL1_40-9699f28.tar.gz -C /var/www/wiki-$environment/$lang/extensions/
    done
done

# UniversalLanguageSelector
wget https://extdist.wmflabs.org/dist/extensions/UniversalLanguageSelector-REL1_40-51ea41a.tar.gz
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        tar -xzf UniversalLanguageSelector-REL1_40-51ea41a.tar.gz -C /var/www/wiki-$environment/$lang/extensions/
    done
done

# Wikibase
wget https://extdist.wmflabs.org/dist/extensions/Wikibase-REL1_40-4e1296d.tar.gz
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        tar -xzf Wikibase-REL1_40-4e1296d.tar.gz -C /var/www/wiki-$environment/$lang/extensions/
    done
done

for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cd /var/www/wiki-$environment/$lang/
        mv composer.local.json-sample composer.local.json
        composer install --no-dev
        php maintenance/run.php ./maintenance/update.php
        php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
        php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
        php maintenance/run.php ./maintenance/populateInterwiki.php
    done
done

# Apache2 setup
mv /etc/apache2/ports.conf /etc/apache2/ports.conf.old
envsubst < /home/$user/wikiadviser/mediawiki-setup/ports.conf > /etc/apache/ports.conf
cd $CONF_DIR
export WIKI_PORT=$dev_port WIKI_PROJECT_DIRECTORY=${project_dir[0]} && envsubst '${WIKI_PORT},${WIKI_PROJECT_DIRECTORY}' < wiki-site.conf > wiki-dev.conf
export WIKI_PORT=$demo_port WIKI_PROJECT_DIRECTORY=${project_dir[1]} && envsubst '${WIKI_PORT},${WIKI_PROJECT_DIRECTORY}' < wiki-site.conf > wiki-demo.conf
export WIKI_PORT=$prod_port WIKI_PROJECT_DIRECTORY=${project_dir[2]} && envsubst '${WIKI_PORT},${WIKI_PROJECT_DIRECTORY}' < wiki-site.conf > wiki-prod.conf
cd
for environment in "${environments[@]}"; do
    cp $CONF_DIR/wiki-$environment.conf /etc/apache2/sites-available/wiki-$environment.conf
    a2ensite wiki-$environment.conf
done
systemctl reload apache2 && systemctl restart apache2