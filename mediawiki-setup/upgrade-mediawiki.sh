#!/bin/sh

set -e
curl -s "https://en.wikipedia.org/wiki/Special:Version" > version_page.html
ulimit -n 4096

##########envs############
languages=("${LANGUAGES[@]}")
environments=("${DATABASE_ENV[@]}")
mediawiki_password="$MEDIAWIKI_PASSWORD"
user="wiki-user"
dump_path="dump"
mediawiki_version=$(grep -oP 'MediaWiki\s\d+\.\d+\.\d+(-wmf\.\d+)?' version_page.html | head -n1 | awk '{print $2}')
##########################

# Clear Pending Jobs
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        /usr/bin/php /var/www/wiki-$environment/$lang/maintenance/run.php /var/www/wiki-$environment/$lang/maintenance/runJobs.php
    done
done

# Create Database dumps
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        echo $mediawiki_password | sudo -S mysqldump -u root "$environment"_wiki_"$lang" > /home/$user/$dump_path/$environment-dump-$lang.sql
    done
done

# Backup old mediawiki folders
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        mv /var/www/wiki-$environment/$lang /var/www/wiki-$environment/$lang.old 
    done
done

# Download new mediawiki package
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        git clone https://gerrit.wikimedia.org/r/mediawiki/core.git --branch wmf/$mediawiki_version /var/www/wiki-$environment/$lang
    done
done

# Install Additional extensions
# PageForms
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
         git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/PageForms.git /var/www/wiki-$environment/$lang/extensions/PageForms
    done
done

# ExternalData
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
         git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/ExternalData /var/www/wiki-$environment/$lang/extensions/ExternalData
    done
done

# RegularToolTips
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
         git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/RegularTooltips.git /var/www/wiki-$environment/$lang/extensions/RegularTooltips
    done
done

# HTMLTags
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
         git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/HTMLTags.git /var/www/wiki-$environment/$lang/extensions/HTMLTags
    done
done

# Update extensions to latest branch changes & fetch external libraries
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cd /var/www/wiki-$environment/$lang
        git submodule update --init --recursive # update extensions
        composer update --no-dev --ignore-platform-req=ext-ldap # fetch external libs
    done
done

# Copy old configuration to the new installation directories
for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cp /var/www/wiki-$environment/$lang.old/LocalSettings.php /var/www/wiki-$environment/$lang/LocalSettings.php
        cp -r /var/www/wiki-$environment/$lang.old/images /var/www/wiki-$environment/$lang/images
        cp -r /var/www/wiki-$environment/$lang.old/resources/assets/icons /var/www/wiki-$environment/$lang/resources/assets/icons
        cp -r /home/$user/wikiadviser/MyVisualEditor /var/www/wiki-$environment/$lang/extensions/MyVisualEditor
    done
done

for environment in "${environments[@]}"; do
    for lang in "${languages[@]}"; do
        cd /var/www/wiki-$environment/$lang/
        mv composer.local.json-sample composer.local.json
        composer install --no-dev --no-interaction --ignore-platform-req=ext-ldap
        php maintenance/run.php ./maintenance/update.php
        php maintenance/run.php ./extensions/Wikibase/lib/maintenance/populateSitesTable.php
        php maintenance/run.php ./extensions/Wikibase/repo/maintenance/rebuildItemsPerSite.php
        php maintenance/run.php ./maintenance/populateInterwiki.php
    done
done

rm /home/$user/version_page.html