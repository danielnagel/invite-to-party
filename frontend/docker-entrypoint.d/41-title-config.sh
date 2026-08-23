#!/bin/sh
set -e

# Runs as a nginx:alpine /docker-entrypoint.d/ script (executed by the base
# image's own entrypoint before nginx starts, see Dockerfile).
#
# APP_TITLE is a docker-compose environment variable, but this is a
# prebuilt static SPA - it can't read process.env at runtime like the
# backend does, so the value is written into a small script the app loads
# before it boots (see frontend/index.html and
# frontend/src/components/AppHeader.vue), regenerated fresh on every
# container start.
#
# Escaped so a title containing a double quote or backslash can't break the
# generated JS string literal.
escaped_title=$(printf '%s' "${APP_TITLE:-Invite to Party}" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /usr/share/nginx/html/title-config.js <<EOF
window.__APP_TITLE__ = "${escaped_title}";
EOF
