#!/bin/bash
set -e
cd "$(dirname "$0")"
[ -e node_modules ] || ln -s /opt/npm-tools/node_modules node_modules
node scripts/build.mjs
