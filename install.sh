#!/usr/bin/env bash
# JellyInstall — interactive Linux systemd installer
# Must be run as root (sudo ./install.sh)

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[info]${RESET}  $*"; }
success() { echo -e "${GREEN}[ok]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $*"; }
die()     { echo -e "${RED}[error]${RESET} $*" >&2; exit 1; }

require_root() {
    [[ $EUID -eq 0 ]] || die "This script must be run as root: sudo $0"
}

ask() {
    # ask <varname> <prompt> [default]
    local varname="$1" prompt="$2" default="${3:-}"
    local display_default=""
    [[ -n "$default" ]] && display_default=" [${default}]"
    while true; do
        read -rp "$(echo -e "${BOLD}${prompt}${display_default}: ${RESET}")" value
        value="${value:-$default}"
        [[ -n "$value" ]] && break
        warn "Value cannot be empty."
    done
    printf -v "$varname" '%s' "$value"
}

ask_password() {
    local varname="$1" prompt="$2"
    local p1 p2
    while true; do
        read -rsp "$(echo -e "${BOLD}${prompt}: ${RESET}")" p1; echo
        read -rsp "$(echo -e "${BOLD}Confirm password: ${RESET}")" p2; echo
        [[ "$p1" == "$p2" ]] && break
        warn "Passwords do not match. Try again."
    done
    printf -v "$varname" '%s' "$p1"
}

ask_yn() {
    # ask_yn <prompt> <default y|n>  → returns 0 for yes, 1 for no
    local prompt="$1" default="${2:-y}"
    local yn
    read -rp "$(echo -e "${BOLD}${prompt} [${default}]: ${RESET}")" yn
    yn="${yn:-$default}"
    [[ "${yn,,}" == "y" ]]
}

# ---------------------------------------------------------------------------
# Root check
# ---------------------------------------------------------------------------

require_root

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

echo
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       JellyInstall — Installer       ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo

# ---------------------------------------------------------------------------
# Resolve install source directory (where this script lives)
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
info "Install source: ${SCRIPT_DIR}"

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------

info "Checking dependencies..."

check_cmd() {
    local cmd="$1" pkg="${2:-$1}"
    if ! command -v "$cmd" &>/dev/null; then
        die "'${cmd}' not found. Install it first:  apt install ${pkg}  (or equivalent)"
    fi
    success "${cmd} found: $(command -v "$cmd")"
}

check_cmd python3 python3
check_cmd node nodejs
check_cmd npm npm
check_cmd git git

# Python version >= 3.11
PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
if (( PY_MAJOR < 3 || (PY_MAJOR == 3 && PY_MINOR < 11) )); then
    die "Python 3.11+ required (found ${PY_VER})"
fi
success "Python ${PY_VER}"

# Node version >= 18
NODE_VER=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
if (( NODE_MAJOR < 18 )); then
    die "Node.js 18+ required (found ${NODE_VER})"
fi
success "Node.js ${NODE_VER}"

echo

# ---------------------------------------------------------------------------
# Interactive questions
# ---------------------------------------------------------------------------

echo -e "${BOLD}-- Service configuration --${RESET}"
echo

# Service user
ask SERVICE_USER "User account to run the service" "jellyinstall"

# Create user if not exists
if ! id "$SERVICE_USER" &>/dev/null; then
    if ask_yn "User '${SERVICE_USER}' does not exist. Create it?" "y"; then
        useradd --system --create-home --shell /bin/bash "$SERVICE_USER"
        success "Created system user: ${SERVICE_USER}"
    else
        die "Cannot continue without a valid service user."
    fi
fi

# Install directory
DEFAULT_INSTALL_DIR="/opt/jellyinstall"
ask INSTALL_DIR "Installation directory" "$DEFAULT_INSTALL_DIR"

# Port
ask PORT "Port to listen on" "8097"

# Movie download directory
ask MOVIE_DIR "Movie download directory" "/mnt/media/Movies"

# Show download directory
ask SHOW_DIR "TV show download directory" "/mnt/media/Shows"

echo
echo -e "${BOLD}-- External APIs --${RESET}"
echo

ask TMDB_API_KEY "TMDB API Key" ""
ask TMDB_ACCESS_TOKEN "TMDB Read Access Token" ""

# JWT secret
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
info "Generated JWT secret (stored in config)."

echo
echo -e "${BOLD}-- Admin account --${RESET}"
echo

ask ADMIN_USER "Admin username" "admin"
ask_password ADMIN_PASS "Admin password"

echo
echo -e "${BOLD}-- Summary --${RESET}"
echo
echo -e "  Service user    : ${CYAN}${SERVICE_USER}${RESET}"
echo -e "  Install dir     : ${CYAN}${INSTALL_DIR}${RESET}"
echo -e "  Port            : ${CYAN}${PORT}${RESET}"
echo -e "  Movie dir       : ${CYAN}${MOVIE_DIR}${RESET}"
echo -e "  Show dir        : ${CYAN}${SHOW_DIR}${RESET}"
echo -e "  Admin username  : ${CYAN}${ADMIN_USER}${RESET}"
echo

ask_yn "Proceed with installation?" "y" || { info "Aborted."; exit 0; }
echo

# ---------------------------------------------------------------------------
# Copy source to install directory
# ---------------------------------------------------------------------------

info "Installing to ${INSTALL_DIR}..."

if [[ "$SCRIPT_DIR" != "$INSTALL_DIR" ]]; then
    if [[ -d "$INSTALL_DIR" ]]; then
        warn "Directory ${INSTALL_DIR} already exists. Overwriting..."
        rm -rf "$INSTALL_DIR"
    fi
    cp -r "$SCRIPT_DIR" "$INSTALL_DIR"
    success "Copied source to ${INSTALL_DIR}"
else
    info "Source is already at install directory, skipping copy."
fi

# ---------------------------------------------------------------------------
# Python virtual environment
# ---------------------------------------------------------------------------

VENV_DIR="${INSTALL_DIR}/.venv"
info "Creating virtual environment at ${VENV_DIR}..."
python3 -m venv "$VENV_DIR"
"${VENV_DIR}/bin/pip" install --quiet --upgrade pip
"${VENV_DIR}/bin/pip" install --quiet -r "${INSTALL_DIR}/requirements.txt"
success "Python venv ready."

# ---------------------------------------------------------------------------
# Build frontend
# ---------------------------------------------------------------------------

info "Building frontend (this may take a minute)..."
cd "$INSTALL_DIR"
"${VENV_DIR}/bin/python" build.py
success "Frontend built."

# ---------------------------------------------------------------------------
# Create directories
# ---------------------------------------------------------------------------

info "Creating download directories..."
mkdir -p "$MOVIE_DIR" "$SHOW_DIR"
chown "$SERVICE_USER":"$SERVICE_USER" "$MOVIE_DIR" "$SHOW_DIR" 2>/dev/null || true
success "Directories ready."

# ---------------------------------------------------------------------------
# Write /etc/jellyinstall/env
# ---------------------------------------------------------------------------

ENV_DIR="/etc/jellyinstall"
ENV_FILE="${ENV_DIR}/env"
info "Writing config to ${ENV_FILE}..."
mkdir -p "$ENV_DIR"
cat > "$ENV_FILE" <<EOF
PORT=${PORT}
JWT_SECRET=${JWT_SECRET}
MOVIE_DIR=${MOVIE_DIR}
SHOW_DIR=${SHOW_DIR}
TMDB_API_KEY=${TMDB_API_KEY}
TMDB_ACCESS_TOKEN=${TMDB_ACCESS_TOKEN}
EOF
chmod 640 "$ENV_FILE"
chown root:"$SERVICE_USER" "$ENV_FILE" 2>/dev/null || true
success "Config written."

# ---------------------------------------------------------------------------
# Create data directory
# ---------------------------------------------------------------------------

DATA_DIR="${INSTALL_DIR}/data"
mkdir -p "$DATA_DIR"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"
success "Ownership set."

# ---------------------------------------------------------------------------
# Systemd service file
# ---------------------------------------------------------------------------

SERVICE_FILE="/etc/systemd/system/jellyinstall.service"
info "Creating systemd service at ${SERVICE_FILE}..."

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=JellyInstall — self-hosted movie/show downloader
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${VENV_DIR}/bin/python run.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable jellyinstall
success "Service enabled."

# ---------------------------------------------------------------------------
# Create admin user
# ---------------------------------------------------------------------------

info "Creating admin user '${ADMIN_USER}'..."
cd "$INSTALL_DIR"
# Source the env file so the app picks up config
set -a; source "$ENV_FILE"; set +a
sudo -u "$SERVICE_USER" env PORT="$PORT" JWT_SECRET="$JWT_SECRET" MOVIE_DIR="$MOVIE_DIR" SHOW_DIR="$SHOW_DIR" \
    "${VENV_DIR}/bin/python" -m backend.app.manage create-user \
    --username "$ADMIN_USER" --password "$ADMIN_PASS"
success "Admin user created."

# ---------------------------------------------------------------------------
# Start service
# ---------------------------------------------------------------------------

info "Starting jellyinstall service..."
systemctl start jellyinstall
sleep 2

if systemctl is-active --quiet jellyinstall; then
    success "Service is running."
else
    warn "Service may not have started correctly. Check: journalctl -u jellyinstall -n 50"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

echo
echo -e "${GREEN}${BOLD}Installation complete!${RESET}"
echo
echo -e "  App URL         : ${CYAN}http://$(hostname -I | awk '{print $1}'):${PORT}${RESET}"
echo -e "  Service status  : ${CYAN}systemctl status jellyinstall${RESET}"
echo -e "  Logs            : ${CYAN}journalctl -u jellyinstall -f${RESET}"
echo -e "  Config          : ${CYAN}${ENV_FILE}${RESET}"
echo
