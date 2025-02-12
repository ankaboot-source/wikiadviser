#!/bin/bash

# Clone the VisualEditor repository and checkout the specified branch
# Takes branch name (version) as input: https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/extensions/VisualEditor/+refs
# Example: sh prepare_VisualEditor_upgrade.sh wmf/1.44.0-wmf.14

if [ -z "$1" ]; then
  echo "Error: No version specified. Please provide a branch name."
  exit 1
fi
# Go To root
cd ..


# 1. Gets the updated branch
git clone -b "$1" https://gerrit.wikimedia.org/r/mediawiki/extensions/VisualEditor.git && git -C VisualEditor submodule update --init

# 2. Searchs for files containing "WikiAdviser" within MyVisualEditor and open them in both MyVisualEditor & the cloned VisualEditor folder in VScode
grep -lir WikiAdviser MyVisualEditor | xargs -I {} sh -c 'code -r "$1" "VisualEditor${1#MyVisualEditor}"' _ {}

# 3. Manually update the code in VisualEditor to match the changes in MyVisualEditor
#Our custom code is marked by /* Custom WikiAdviser */ comments to help identify what needs to be copied.
#    Verify changes in the following files:
#      - ve.init.mw.ProgressBarWidget.js
#      - ve.ui.DiffElement.js
#      - ve.init.mw.DesktopArticleTarget.init.js
#      - ve.init.mw.Target.js
#      - ve.init.mw.ArticleTarget.js
#After verification, delete MyVisualEditor and rename VisualEditor to MyVisualEditor
