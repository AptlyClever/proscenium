#!/usr/bin/env bash
# Installs a portable JDK 17 (required: app/build.gradle.kts sourceCompatibility/
# targetCompatibility/jvmTarget = 17) for hosts with no system Java, and points
# Gradle at it via the user-level ~/.gradle/gradle.properties (not this repo's
# tracked gradle.properties, so it stays host-local like .tools/android-sdk).
#
# Idempotent: safe to re-run.

set -euo pipefail

JDK_VERSION="17.0.19+10"
JDK_URL="https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.19%2B10/OpenJDK17U-jdk_x64_linux_hotspot_17.0.19_10.tar.gz"
JDK_SHA256="d8afc263758141a66e0e3aafc321e783f7016696f4eaea067d340a269037d331"
INSTALL_DIR="$HOME/.local/jdks/temurin-17"

if [ -x "$INSTALL_DIR/bin/java" ]; then
  echo "Temurin JDK 17 already installed at $INSTALL_DIR"
else
  echo "Installing Temurin JDK $JDK_VERSION to $INSTALL_DIR ..."
  mkdir -p "$HOME/.local/jdks"
  TMP_TAR="$(mktemp)"
  curl -sSL -o "$TMP_TAR" "$JDK_URL"
  echo "$JDK_SHA256  $TMP_TAR" | sha256sum -c -
  TMP_DIR="$(mktemp -d)"
  tar xzf "$TMP_TAR" -C "$TMP_DIR"
  rm -f "$TMP_TAR"
  EXTRACTED_DIR="$(find "$TMP_DIR" -maxdepth 1 -type d -name 'jdk-*')"
  mv "$EXTRACTED_DIR" "$INSTALL_DIR"
  rmdir "$TMP_DIR" 2>/dev/null || true
  echo "Installed: $("$INSTALL_DIR/bin/java" -version 2>&1 | head -1)"
fi

mkdir -p "$HOME/.gradle"
GRADLE_PROPS="$HOME/.gradle/gradle.properties"
touch "$GRADLE_PROPS"
if ! grep -q "^org.gradle.java.home=" "$GRADLE_PROPS" 2>/dev/null; then
  echo "org.gradle.java.home=$INSTALL_DIR" >> "$GRADLE_PROPS"
  echo "Set org.gradle.java.home in $GRADLE_PROPS"
else
  echo "org.gradle.java.home already set in $GRADLE_PROPS"
fi

cat <<EOF

Done. To use 'java'/'javac' directly (not just via Gradle), add to your shell profile:
  export JAVA_HOME=$INSTALL_DIR
  export PATH="\$JAVA_HOME/bin:\$PATH"

Unit tests also need a broker secret (any local/dev value, min 16 chars — NOT the
real production secret) since app/build.gradle.kts requires one to build BuildConfig:
  export LCARD_OVERLAY_BROKER_SECRET="dev-local-test-secret-only-not-for-prod"

Verify with: ./gradlew test
EOF
