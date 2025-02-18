#!/bin/bash

# Check if the PR URL is provided as an argument
if [ -z "$1" ]; then
    echo "Usage: $0 <pr-url>"
    exit 1
fi

# Variables
FRONTEND_PR_URL="$1"
BACKEND_REPO_URL="https://api.github.com/repos/content-services/content-sources-backend"
BACKEND_GIT_REPO_URL="https://github.com/content-services/content-sources-backend.git"
CLONE_DIR=content-sources-backend
TAG_NAME="#testwith https://github.com/content-services/content-sources-backend/pull/"

# Check if the folder exists
if [ -d "$CLONE_DIR" ]; then
    echo "Folder '$CLONE_DIR' exists. Removing it..."
    rm -rf "$CLONE_DIR"

    # Check if the removal was successful
    if [ ! -d "$CLONE_DIR" ]; then
        echo "Successfully removed the folder '$CLONE_DIR'."
    else
        echo "Failed to remove the folder '$CLONE_DIR'."
        exit 1
    fi
fi

# Create clone directory if it doesn't exist
mkdir -p $CLONE_DIR

pr_description=""

# If coming from PR try to fetch description
pattern="https://github.com/([^/]+)/([^/]+)/pull/([0-9]+)"
if [[ $FRONTEND_PR_URL =~ $pattern ]]; then
    OWNER=${BASH_REMATCH[1]}
    REPO=${BASH_REMATCH[2]}
    PR_NUMBER=${BASH_REMATCH[3]}

    # Fetch the PR details using GitHub API
    pr_details=$(curl -s "https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER")

    # Check if we could fetch the PR details
    if [ -z "$pr_details" ]; then
        echo "Failed to fetch PR details. Cloning main branch."
        git clone --branch main $BACKEND_GIT_REPO_URL $CLONE_DIR
        exit 1
    fi

    # Extract the PR description using jq
    pr_description=$(echo "$pr_details" | jq -r '.body')

    # Output the PR description
    echo "PR Description:"
    echo "$pr_description"
fi

# Check for the backend PR pattern and extract the PR number
backend_pattern="#testwith https://github.com/content-services/content-sources-backend/pull/([0-9]+)"
if [[ $pr_description =~ $backend_pattern ]]; then
    backend_pr_number=${BASH_REMATCH[1]}
    echo "Found backend PR number: $backend_pr_number"

    # Fetch the backend PR details
    backend_pr=$(curl -s "$BACKEND_REPO_URL/pulls/$backend_pr_number")
    backend_pr_branch=$(echo "$backend_pr" | jq -r '.head.ref')

    # Clone the backend repo with the associated PR branch
    echo "Cloning backend PR #$backend_pr_number: $backend_pr_branch"
    git clone --branch $backend_pr_branch $BACKEND_GIT_REPO_URL $CLONE_DIR

    # Check if the clone was successful
    if [ $? -eq 0 ]; then
        echo "Successfully cloned backend PR #$backend_pr_number into $CLONE_DIR"
    else
        echo "Failed to clone backend PR #$backend_pr_number"
        exit 1
    fi
else
    echo "No matching backend PR URL found in the frontend PR description. Cloning the main branch."
    git clone --branch main $BACKEND_GIT_REPO_URL $CLONE_DIR

    # Check if the clone was successful
    if [ $? -eq 0 ]; then
        echo "Successfully cloned main branch into $CLONE_DIR"
    else
        echo "Failed to clone the main branch"
        exit 1
    fi
fi
