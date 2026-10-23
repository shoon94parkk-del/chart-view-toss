#!/usr/bin/env bash
set -euo pipefail

if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux ]]; then
  echo 'This helper only configures Linux GitHub Actions runners.' >&2
  exit 1
fi

# Hosted Ubuntu runners already include these official HTTPS fallbacks. Keep
# their suites, components, Signed-By configuration and package verification.
mirrors=/etc/apt/apt-mirrors.txt
if [[ -f "$mirrors" ]] \
  && grep -Eq '^https://archive\.ubuntu\.com/ubuntu/?([[:space:]]|$)' "$mirrors" \
  && grep -Eq '^https://security\.ubuntu\.com/ubuntu/?([[:space:]]|$)' "$mirrors"; then
  sudo sed -Ei '\#^http://azure\.archive\.ubuntu\.com/ubuntu/?([[:space:]]|$)#d' "$mirrors"
  echo 'APT uses the runner-provided official Ubuntu HTTPS mirrors.'
else
  echo 'Official HTTPS fallbacks not both present; preserving runner mirrors.'
fi

# Match actions/runner-images: NN-* configuration may override earlier files.
# An idle timeout bounds failed sockets; workflow step deadlines also bound a
# mirror that keeps sending data too slowly to finish the setup.
sudo tee /etc/apt/apt.conf.d/zz-retries >/dev/null <<'EOF'
Acquire::Retries "1";
Acquire::http::Timeout "15";
Acquire::https::Timeout "15";
EOF
apt-config dump Acquire::Retries Acquire::http::Timeout Acquire::https::Timeout
