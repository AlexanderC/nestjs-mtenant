#!/usr/bin/env bash

git push --follow-tags origin master
npx rimraf dist
npm run build
npm publish --access public
