#!/bin/bash

# Go To root
cd ..

# Clone the VisualEditor repository and checkout the specified branch
# Takes branch name (version) as input: https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/extensions/VisualEditor/+refs
# 0. E.g.: sh ./prepare_VisualEditor_upgrade.sh wmf/1.43.0-wmf.3

# 1. Gets the updated branch
git clone -b "$1" https://gerrit.wikimedia.org/r/mediawiki/extensions/VisualEditor.git && git -C VisualEditor submodule update --init

# 2. Searchs for files containing "WikiAdviser" within MyVisualEditor and open them in both MyVisualEditor & the cloned VisualEditor folder in VScode
grep -lir WikiAdviser MyVisualEditor | xargs -I {} sh -c 'code -r "$1" "VisualEditor${1#MyVisualEditor}"' _ {}

# 3. Then manually update the code in VisualEditor to match the changes in MyVisualEditor