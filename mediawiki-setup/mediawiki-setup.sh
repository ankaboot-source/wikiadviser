#!/bin/sh
# A script that sets up mediawiki multi-environment instances

###################################################################
###############################VARS################################
export DEBIAN_FRONTEND=noninteractive
project_dir=("wiki-dev" "wiki-demo" "wiki-prod")
dev_port="8081"
demo_port="8080"
prod_port="8082"
PRIVATE_IP="$PRIVATE_IP"
user="wiki-user"
CONF_DIR="/home/$user/wikiadviser/mediawiki-setup"
languages=("${LANGUAGES[@]}") # Add the list of languages to GitHub Secrets
environments=("${DATABASE_ENV[@]}") # Add the list of environments to GitHub Secrets
mediawiki_version=("${MEDIAWIKI_VERSION[@]]}") # Add mediawiki version to Github Secrets MEDIAWIKI_VERSION=("1.40" "1.40.1") ##1.40 release version ##1.40.1 file version
extension_version=${mediawiki_version[0]//./_} # Convert 1.40 => 1_40
PageForms_version="$PAGEFORMS_VERSION" # Unlike other extensions you need to add this variable to Github Secrets since it not same way of download, please choose PageForms Version according to your mediawiki version!
TemplateStyle_version=$(curl -s https://extdist.wmflabs.org/dist/extensions/ | grep -o "TemplateStyles-REL$extension_release-[0-9a-f]*.tar.gz" | awk -F'-' '{print $3}' | sed 's/.tar.gz//' | sort -u)
ULS_version=$(curl -s https://extdist.wmflabs.org/dist/extensions/ | grep -o "UniversalLanguageSelector-REL$extension_release-[0-9a-f]*.tar.gz" | awk -F'-' '{print $3}' | sed 's/.tar.gz//' | sort -u)
Wikibase_version=$(curl -s https://extdist.wmflabs.org/dist/extensions/ | grep -o "Wikibase-REL$extension_release-[0-9a-f]*.tar.gz" | awk -F'-' '{print $3}' | sed 's/.tar.gz//' | sort -u | tail -n 1)
fr_dump_token_demo="$FR_DUMP_TOKEN_DEMO"
fr_dump_token_prod="$FR_DUMP_TOKEN_PROD"
en_dump_token_demo="$EN_DUMP_TOKEN_DEMO"
en_dump_token_prod="$EN_DUMP_TOKEN_PROD"
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

# PHP
apt install -y php libapache2-mod-php php-mbstring php-mysql php-xml

# Database #recommended MySQL/Mariadb
apt install -y mariadb-server

# Setup DB
systemctl enable mariadb
systemctl start mariadb

for lang in "${languages[@]}"; do
do
    for env in "${environments[@]}"; do
        mariadb -u root -e "CREATE DATABASE "$env"_wiki_"$lang";"
        mariadb -u root -e "CREATE USER '"$env"_wiki_"$lang"'@'localhost' IDENTIFIED BY '"$env"_wiki_"$lang"';"
        mariadb -u root -e "GRANT ALL PRIVILEGES ON "$env"_wiki_"$lang".* TO '"$env"_wiki_"$lang"'@'localhost' WITH GRANT OPTION;"
   done
done

# Import database dumps
wget "$fr_dump_token_demo" -O /home/"$user"/fr-wiki-dump.sql
wget "$fr_dump_token_prod" -O /home/"$user"/fr-wiki-dump-prod.sql
wget "$en_dump_token_demo" -O /home/"$user"/en-wiki-dump.sql
wget "$en_dump_token_prod" -O /home/"$user"/en-wiki-dump-prod.sql

for lang in "${languages[@]}"; do
do
    for env in "${environments[@]}"; do
        if [ "$env" = "prod" ]
        then
            mariadb -u root  -e "use "$env"_wiki_"$lang"; source /home/"$user"/"$lang"-wiki-dump-prod.sql"
        else
            mariadb -u root  -e "use "$env"_wiki_"$lang"; source /home/"$user"/"$lang"-wiki-dump.sql"
        fi
    done
done

for lang in "${languages[@]}"; do
    rm -f $lang-wiki-*
done;
 

# Script equivalent to mysql_secure_installation
mysql -u root <<-EOF
UPDATE mysql.user SET Password=PASSWORD('"$MARIADB_ROOT_PWD"') WHERE User='root';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.db WHERE Db='test' OR Db='test_%';
FLUSH PRIVILEGES;
EOF

# Mediawiki Setup
# Install Mediawiki source code
for environment in "${environments[@]}"; do
    mkdir -p "/var/www/wiki-"$environment""
    chown $user:$user /var/www/wiki-"$environment"
done

##login as the user created
su $user

curl -O https://releases.wikimedia.org/mediawiki/"${mediawiki_version[0]}"/mediawiki-"${mediawiki_version[1]}".tar.gz
tar -xf mediawiki-"${mediawiki_version[1]}".tar.gz

for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cp -r mediawiki-"${mediawiki_version[1]}" /var/www/wiki-"$environment"/"$lang"
    done
done

for env in "${environments[@]}"; do

    for lang in "${languages[@]}"; do
        if [ "$env" = "prod" ]
        then
             SERVER_ENDPOINT="https://wiki.wikiadviser.io" URL_PATH="/"$lang"" LANGUAGE="$lang" DB_NAME=""$env"_wiki_"$lang"" DB_USER=""$env"_wiki_"$lang"" DB_PASSWORD=""$env"_wiki_"$lang""  envsubst '$SERVER_ENDPOINT $URL_PATH $LANGUAGE $DB_NAME $DB_USER $DB_PASSWORD' < LocalSettings.php > ./LocalSettings_prod_"$lang".php
        else
             SERVER_ENDPOINT="https://wiki-"$env".wikiadviser.io" URL_PATH="/"$lang"" LANGUAGE="$lang" DB_NAME=""$env"_wiki_"$lang"" DB_USER=""$env"_wiki_"$lang"" DB_PASSWORD=""$env"_wiki_"$lang""  envsubst '$SERVER_ENDPOINT $URL_PATH $LANGUAGE $DB_NAME $DB_USER $DB_PASSWORD' < LocalSettings.php > ./LocalSettings_"$env"_"$lang".php
        fi
    done
done

for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cp $CONF_DIR/LocalSettings_"$environment"_"$lang".php /var/www/wiki-"$environment"/"$lang"/LocalSettings.php
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
wget  https://github.com/wikimedia/mediawiki-extensions-PageForms/archive/$PageForms_version.zip
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        unzip $PageForms_version.zip -d /var/www/wiki-$environment/$lang/extensions/
        mv /var/www/wiki-$environment/$lang/extensions/mediawiki-extensions-PageForms-$PageForms_version/ /var/www/wiki-$environment/$lang/extensions/PageForms
    done
done

# TemplateStyle
wget https://extdist.wmflabs.org/dist/extensions/TemplateStyles-REL$extension_version-$TemplateStyle_version.tar.gz
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        tar -xzf TemplateStyles-REL1_40-9699f28.tar.gz -C /var/www/wiki-$environment/$lang/extensions/
    done
done

# UniversalLanguageSelector
wget https://extdist.wmflabs.org/dist/extensions/UniversalLanguageSelector-REL$extension_version-$ULS_version.tar.gz
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        tar -xzf UniversalLanguageSelector-REL1_40-51ea41a.tar.gz -C /var/www/wiki-$environment/$lang/extensions/
    done
done

# Wikibase
wget https://extdist.wmflabs.org/dist/extensions/Wikibase-REL$extension_version-$Wikibase_version.tar.gz
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        tar -xzf Wikibase-REL1_40-4e1296d.tar.gz -C /var/www/wiki-$environment/$lang/extensions/
    done
done

for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cd /var/www/wiki-$environment/$lang/
        mv composer.local.json-sample composer.local.json
        composer install --no-dev --no-interaction
        php maintenance/run.php ./maintenance/update.php
        php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
        php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
        php maintenance/run.php ./maintenance/populateInterwiki.php
    done
done