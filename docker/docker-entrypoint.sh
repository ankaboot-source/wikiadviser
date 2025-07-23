#!/bin/bash
set -e

################# Load .env file ###########
if [ -f .env ]; then
    source .env
fi
################## Vars ####################

FLAG_FILE="/data/.initialized"
HC_FLAG_FILE="/wikiadviser/mediawiki-setup/.setup_complete"
MW_ADMIN_USER="Admin"
MW_ADMIN_PASSWORD="admin#2025"
MW_BOT_USER="wikiadviser-bot"
COMMON_FILES_PATH="/common-files"
CITOID_PATH="/citoid"

mw_init_dump_fr="https://rcsxuyoogygnyjbwbrbb.supabase.co/storage/v1/object/sign/mediawiki-init/init-dump-fr.sql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZWRpYXdpa2ktaW5pdC9pbml0LWR1bXAtZnIuc3FsIiwiaWF0IjoxNzQwNzM0MjA2LCJleHAiOjQ4NjI3OTgyMDZ9.Q5bEpxsrWFP0KF-rVJXmt4zK3ypU-1qmpIAislLx9bs"
mw_init_dump_en="https://rcsxuyoogygnyjbwbrbb.supabase.co/storage/v1/object/sign/mediawiki-init/init-dump-en.sql?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZWRpYXdpa2ktaW5pdC9pbml0LWR1bXAtZW4uc3FsIiwiaWF0IjoxNzQwNzM0MTgzLCJleHAiOjQ4NjI3OTgxODN9.2Fw1v-5jTrPSDSxpavIUS3E45jZL8UjNoGlMbLOwHOg"

# Convert space-separated string to array
LANGUAGES=($LANGUAGES)
LANG_ARRAY=("${LANGUAGES[@]:-en}") # Languages of your wiki instances.

############################################

# Function to wait for MariaDB to be ready
wait_for_db() {
  local host="$1"
  local port="$2"
  echo "Waiting for MariaDB at $host:$port..."
  while ! nc -z "$host" "$port"; do
    sleep 1
  done
  echo "mediawiki_db is up!"
}

if [ ! -f "$FLAG_FILE" ]; then

  echo "Setting up database..."
  echo ""
  sleep 2
  # Wait for the database
  wait_for_db "mediawiki_db" 3306

  echo "Running database setup..."

  # Database (recommended: MySQL/Mariadb)
  echo "Installing MariaDB-server..."
  echo ""
  apt install -y mariadb-server
  echo ""
  echo "MariaDB-server installed!"
  echo ""

  # Download mediawiki init dumps
  for ln in "${LANG_ARRAY[@]}"; do
      dump_file="mw_init_dump_${ln}"
      wget "${!dump_file}" -O ./init-dump-${ln}.sql
  done


  # Setup DB
  for ln in "${LANG_ARRAY[@]}"; do

      DB_NAME="DB_NAME_${ln}"
      DB_USER="DB_USER_${ln}"
      DB_PASS="DB_PASS_${ln}"

      echo "Creating base for your '${ln}' Wiki..."
      echo ""
      mariadb -h ${DB_HOST} -u root -p${DB_ROOT_PASSWORD} -e "CREATE DATABASE ${!DB_NAME};"
      mariadb -h ${DB_HOST} -u root -p${DB_ROOT_PASSWORD} -e "CREATE USER '${!DB_USER}'@'%' IDENTIFIED BY '${!DB_PASS}';"
      mariadb -h ${DB_HOST} -u root -p${DB_ROOT_PASSWORD} -e "GRANT ALL PRIVILEGES ON ${!DB_NAME}.* TO '${!DB_USER}'@'%' WITH GRANT OPTION;"
      echo "Importing Init Dumps..."
      mariadb -h ${DB_HOST} -u root -p${DB_ROOT_PASSWORD} -D ${!DB_NAME} < ./init-dump-${ln}.sql

      echo "'${ln}' wiki setup completed!"
  done

  # Creating MW BotPassword
  for ln in "${LANG_ARRAY[@]}"; do
      echo "Creating BotPassword for $ln wiki"
      botpassword_output=$(php /var/www/mediawiki/wiki/$ln/maintenance/createBotPassword.php $MW_ADMIN_USER --appid $MW_BOT_USER --grants "basic,highvolume,import,editpage,editprotected,editmycssjs,editmyoptions,editinterface,editsiteconfig,createeditmovepage,uploadfile,uploadeditmovefile,patrol,rollback,blockusers,viewdeleted,viewrestrictedlogs,delete,oversight,protect,viewmywatchlist,editmywatchlist,sendemail,createaccount,privateinfo,mergehistory")
      php /var/www/mediawiki/wiki/$ln/maintenance/run.php /var/www/mediawiki/wiki/$ln/maintenance/update.php

      BOT_USERNAME=$(echo "$botpassword_output" | grep -oP "username:'\K[^']+")
      BOT_PASSWORD=$(echo "$botpassword_output" | grep -oP "password:'\K[^']+")

      # Save all credentials into a local file
      echo "["$ln"] Mediawiki BotPassword user: $BOT_USERNAME" >> /wikiadviser/mediawiki-setup/MW_CREDENTIALS.txt
      echo "["$ln"] Mediawiki BotPassword password: $BOT_PASSWORD" >> /wikiadviser/mediawiki-setup/MW_CREDENTIALS.txt
  done

  echo "Mediawiki admin user: $MW_ADMIN_USER" >> /wikiadviser/mediawiki-setup/MW_CREDENTIALS.txt
  echo "Mediawiki admin password: $MW_ADMIN_PASSWORD" >> /wikiadviser/mediawiki-setup/MW_CREDENTIALS.txt

  for ln in "${LANG_ARRAY[@]}"; do
      echo "Importing Common-$ln.js & Common-$ln.css..."
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "MediaWiki:Common.js" < $COMMON_FILES_PATH/Common-$ln.js
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "MediaWiki:Common.css" < $COMMON_FILES_PATH/Common-$ln.css

      echo "Importing Citoid Modules and templates..."
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Citation/doc" < $CITOID_PATH/Citation_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Citation" < $CITOID_PATH/Citation_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_AV_media/doc" < $CITOID_PATH/Cite_AV_media_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_AV_media" < $CITOID_PATH/Cite_AV_media_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_book/doc" < $CITOID_PATH/Cite_book_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_book" < $CITOID_PATH/Cite_book_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_book/TemplateData" < $CITOID_PATH/Cite_book_TemplateData_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_journal/doc" < $CITOID_PATH/Cite_journal_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_journal" < $CITOID_PATH/Cite_journal_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_news/doc" < $CITOID_PATH/Cite_news_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_news" < $CITOID_PATH/Cite_news_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_patent/doc" < $CITOID_PATH/Cite_patent_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_patent" < $CITOID_PATH/Cite_patent_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_thesis/doc" < $CITOID_PATH/Cite_thesis_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_thesis" < $CITOID_PATH/Cite_thesis_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_web/doc" < $CITOID_PATH/Cite_web_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Cite_web" < $CITOID_PATH/Cite_web_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Template:Documentation" < $CITOID_PATH/Template_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Module:Documentation" < $CITOID_PATH/Module_doc_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Module:Documentation/config" < $CITOID_PATH/Module_doc_conf_$ln
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "Module:Arguments" < $CITOID_PATH/Module_arguments_$ln

      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "MediaWiki:Cite-tool-definition.json" < $CITOID_PATH/Cite-tool-definition_$ln.json
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "MediaWiki:Citoid-template-type-map.json" < $CITOID_PATH/Citoid-template-type-map_$ln.json
      php /var/www/mediawiki/wiki/$ln/maintenance/edit.php --summary "Automated update" --user Admin "MediaWiki:Visualeditor-template-tools-definition.json" < $CITOID_PATH/Visualeditor-template-tools-definition_$ln.json

      php /var/www/mediawiki/wiki/$ln/maintenance/run.php /var/www/mediawiki/wiki/$ln/maintenance/runJobs.php


  done

  touch "$FLAG_FILE"
  touch "$HC_FLAG_FILE"

else

  echo "Already initialized, skipping database setup"
  touch "$HC_FLAG_FILE"
fi

# Execute the main container command
exec "$@"
