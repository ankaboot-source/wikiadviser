#!/bin/bash

# Check if a version (branch name) is provided; if not, display an error and exit
# Note: Providing a version is mandatory for the script to run correctly.
if [ -z "$1" ]; then
  echo "Error: No version specified. Please provide a branch name."
  exit 1
fi
# Go To root
cd ..

# Clone the VisualEditor repository and checkout the specified branch
# Takes branch name (version) as input: https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/extensions/VisualEditor/+refs
# Example: sh prepare_VisualEditor_upgrade.sh <branch-name>

# 1. Gets the updated branch
git clone -b "$1" https://gerrit.wikimedia.org/r/mediawiki/extensions/VisualEditor.git && git -C VisualEditor submodule update --init

# 2. Searchs for files containing "WikiAdviser" within MyVisualEditor and open them in both MyVisualEditor & the cloned VisualEditor folder in VScode
grep -lir WikiAdviser MyVisualEditor | xargs -I {} sh -c 'code -r "$1" "VisualEditor${1#MyVisualEditor}"' _ {}

# 3. Then manually update the code in VisualEditor to match the changes in MyVisualEditor, Delete MyVisualEditor and rename VisualEditor to MyVisualEditor