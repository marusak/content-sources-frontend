#!/bin/bash

# Workaround needed for Konflux pipeline to pass

DEL_DIR="./source/source/"
if [ -d "$DEL_DIR" ]; then rm -Rf $DEL_DIR; fi

setNpmOrYarn
install
build
if [ "$IS_PR" == true ]; then
    verify
else
    export BETA=false
    build
    source build_app_info.sh
    mv ${DIST_FOLDER} stable
    export BETA=true
    # export sentry specific variables
    export ENABLE_SENTRY SENTRY_AUTH_TOKEN SENTRY_DSN SENTRY_ORG SENTRY_PROJECT
    build
    source build_app_info.sh
    mv ${DIST_FOLDER} preview
    mkdir -p ${DIST_FOLDER}
    mv stable ${DIST_FOLDER}/stable
    mv preview ${DIST_FOLDER}/preview
fi

# End workaround

