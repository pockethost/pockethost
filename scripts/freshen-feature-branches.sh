#!/bin/bash

# Get all branches that start with 'feat/' and store them in an array
feat_branches=($(git branch | grep '^  feat/' | sed 's/  //'))

# Loop through each 'feat/' branch
for branch in "${feat_branches[@]}"; do
    # Checkout the 'feat/' branch
    git checkout "$branch"

    # Merge 'master' into the 'feat/' branch
    echo "Merging 'master' into '$branch'..."
    git merge master

    # Check if there are merge conflicts
    if [ $? -ne 0 ]; then
        echo "Merge conflict detected in '$branch'. Resolve the conflict and then press Enter to continue..."
        read -p ""
    fi
done

# Checkout master branch or the initial branch after completing the merges
git checkout master

echo "All 'feat/' branches have been processed."
