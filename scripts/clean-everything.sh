#!/usr/bin/env bash

# Fail if anything in here fails
set -e

# This script runs from the project root
cd "$(dirname "$0")/.."

source scripts/helpers.sh

###################################################################################################
# Halt running processes and local servers

if command_exists killall; then
  run_command killall -v node || true
fi

if command_exists xcrun; then
  run_command xcrun simctl shutdown all || true
fi

##################################################################################################
# Clear caches

run_npm_command jest --clearCache --config={}

run_command npm cache clean --force
run_command yarn cache clean

if command_exists watchman; then
  run_command watchman watch-del-all
fi

run_command "rm -rf
  $TMPDIR/react-*
  "

##################################################################################################
# Remove generated files

run_command "rm -rf
  .yarn
  build/
  coverage/
  dist/
  node_modules/
  storybook-static/
  lerna-debug.log*
  npm-debug.log*
  yarn-debug.log*
  yarn-error.log*
  "

run_command "rm -rf
  examples/*/build
  examples/*/coverage-local
  examples/*/node_modules
  examples/*/lerna-debug.log*
  examples/*/npm-debug.log*
  examples/*/yarn-debug.log*
  examples/*/yarn-error.log*
  "

run_command "rm -rf
  packages/*/coverage-local
  packages/*/dist
  packages/*/lib-dist
  packages/*/node_modules
  packages/*/lerna-debug.log*
  packages/*/npm-debug.log*
  packages/*/yarn-debug.log*
  packages/*/yarn-error.log*
  "
