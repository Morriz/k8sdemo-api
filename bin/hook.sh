#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cp -f $DIR/post-* $DIR/pre-commit $DIR/../.git/hooks/