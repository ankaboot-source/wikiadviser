#!/bin/bash

set -e

PORTS=("8080" "9000")
GAME_SESSION_TYPE_FILE="/tmp/game_session_type.$$"

# Function to check if tmux is available
check_tmux() {
    if command -v tmux &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to check if screen is available
check_screen() {
    if command -v screen &> /dev/null; then
        return 0
    else
        return 1
    fi
}


# Function to run waiting game in tmux or screen
start_game() {
  if check_tmux; then
    tmux new-session -d -s waiting_game "./tetris/shtris"
    sleep 2
    echo "tmux" > "$GAME_SESSION_TYPE_FILE"
    tmux attach -t waiting_game || true
  elif check_screen; then
    sleep 2
    echo "screen" > "$GAME_SESSION_TYPE_FILE"
    screen -S waiting_game ./tetris/shtris 
  fi
}

stop_game() {
  if [ -f "$GAME_SESSION_TYPE_FILE" ]; then
    GAME_SESSION_TYPE=$(cat "$GAME_SESSION_TYPE_FILE")
    case "$GAME_SESSION_TYPE" in
      tmux)
        echo "[tmux] Stopping waiting game..."
        tmux kill-session -t waiting_game 2>/dev/null || true
        ;;
      screen)
        echo "[screen] Stopping waiting game..."
        screen -S waiting_game -X quit 2>/dev/null || true
        ;;
    esac
    rm -f "$GAME_SESSION_TYPE_FILE"
  fi
}

# Function to show setup status
show_status() {
  echo ""
  echo "========================================================================"
  echo "Setup is running in the background!"
  echo "Please don't close this terminal until setup completes."
  echo "You can monitor progress in a separate terminal with: tail -f setup.log"
  echo "========================================================================"
  echo ""
}

# Loading animation on waiting room
show_loading() {
  local frames=("⣾" "⣽" "⣻" "⢿" "⡿" "⣟" "⣯" "⣷")
  local colors=("31" "32" "33" "34" "35" "36") 
  local delay=0.1
  local frame_idx=0
  local color_idx=0
  
  # Hide cursor
  echo -ne "\033[?25l"
  
  while kill -0 $SETUP_PID 2>/dev/null; do
    printf "\r\033[K\033[1;${colors[color_idx]}m%s\033[0m Setup in progress..." "${frames[frame_idx]}"
    sleep $delay
    frame_idx=$(( (frame_idx+1) % ${#frames[@]} ))
    color_idx=$(( (color_idx+1) % ${#colors[@]} ))
  done
  
  # Show cursor again
  echo -ne "\033[?25h"
  printf "\n\n\r\033[K\033[1;32m✅ Setup complete!\033[0m\n"
}
# Cleanup function
cleanup() {
  echo ""
  printf "\n\r\033[K\033[1;35mCleaning up services...\033[0m\n"
  echo "Stopping Wikiadviser & Mediawiki..."
  pushd docker && docker compose down && popd
  echo "Stopping Supabase..."
  npx supabase stop 2>/dev/null
  echo "All services stopped."
  rm -f setup.log 2>/dev/null || true
  stop_game
  exit 0
}
# Trap signals
trap cleanup SIGINT SIGTERM EXIT

# Check for ports availability
printf "\033[K\033[1;35mChecking for ports Availability...\033[0m\n\n"
sleep 1
for port in "${PORTS[@]}"; do
  if (ss -tuln; netstat -tuln 2>/dev/null) | grep -q ":$port "; then
      printf "\033[K\033[1;31m❌ Port $port is already in use. Free it and restart the script.\033[0m\n"
      exit 1
  else
      printf "\033[K\033[1;32m✅ Port $port\033[0m\n"
  fi
done

echo ""
echo "========================================================================"
echo "  🚀  Starting Services..."
echo "------------------------------------------------------------------------"
echo "      • Supabase"
echo "      • Wikiadviser"
echo "      • MediaWiki"
echo ""
echo "  ⏳ Estimated First Startup: ~30 minutes"
echo "  ☕ Grab a coffee or some tea while you wait..."
echo "  🎮 Or just play some Tetris!"
echo "========================================================================"
echo ""

# Setup Supabase, Wikiadviser & MW in background
(
    exec > setup.log 2>&1
    # Check if package-lock.json exists
    if [ -f "package-lock.json" ]; then
      echo "package-lock.json found, skipping 'npm install'"
    else
      echo "package-lock.json not found, running 'npm install'"
      npm i # To install Supabase dependencies
    fi
    echo "Stopping local Supabase..."
    echo ""
    npx supabase stop 2>/dev/null
    echo ""
    echo "Starting local Supabase..."
    echo ""
    npx supabase start > supabase.log
    echo "Updating .env files..."
    echo ""
    bash ./generate-env.sh --supabase-creds supabase.log
    echo ""
    echo "Starting Mediawiki & Wikiadviser..."
    echo ""
    pushd docker && docker compose up -d && popd
    echo ""
    echo "Updating .env files..."
    echo ""
    bash ./generate-env.sh --bot-creds
    echo ""
    stop_game
    echo "✅ All services started successfully"
) &
SETUP_PID=$!

if check_tmux || check_screen; then
    echo -n "Press any KEY to play the game or ESC to stay in waiting room. Auto start in "

    for i in {30..1}; do
        printf "%2d" $i    
        set +e
        read -rs -n1 -t 1 key
        read_exit_code=$?
        set -e
        if [[ $read_exit_code -eq 0 ]]; then
            echo -ne "\r\033[K"
            break
        fi
        if [[ $i -gt 1 ]]; then
            echo -ne "\b\b  \b\b"
        fi
    done

    echo -ne "\r\033[K"

    if [[ $read_exit_code -gt 0 ]]; then
        printf "\033[K\033[1;35mStarting game automatically...\033[0m\n"
        game_choice="play"
    elif [[ $(printf "%d" "'$key") -eq 27 ]]; then
        printf "\033[K\033[1;35mESC pressed. Staying in waiting room.\033[0m\n\n"
        game_choice="skip"
    elif [[ "$key" == "" ]]; then
        printf "\033[K\033[1;35mStarting game...\033[0m\n"
        game_choice="play"
    else
        printf "\033[K\033[1;35mStarting game...\033[0m\n"
        game_choice="play"
    fi

    if [[ "$game_choice" == "play" ]]; then
        printf "\033[K\033[1;35mAttaching to game...\033[0m  (Press \033[1;35mCtrl+C\033[0m to detach and return to setup)\n"
        sleep 2
        start_game
        show_status
    fi
else
    printf "\033[K\033[1;31m❌ tmux/screen are not available. Staying in waiting room.\033[0m\n\n"
fi

# Show loading animation while waiting for setup to complete
show_loading

# Wait for setup to complete
wait $SETUP_PID
sleep 2

# Show setup log
echo ""
printf "\033[K\033[1;35mSetup Logs :\033[0m\n\n"
cat setup.log

echo ""
echo "┌────────────────────────────────────────────────────┐"
echo "│                 SERVICES ENDPOINTS                 │"
echo "├────────────────────────────────────────────────────┤"
echo "│                                                    │"
echo "│  WikiAdviser:                                      │"
echo "│  http://localhost:9000                             │"
echo "│                                                    │"
echo "│  MediaWiki:                                        │"
echo "│  http://localhost:8080/wiki/en/index.php/          │"
echo "│                                                    │"
echo "│  Supabase Studio:                                  │"
echo "│  http://localhost:54323/project/default/auth/users │"
echo "│  (Create auth user here to login to Wikiadviser)   │"
echo "│                                                    │"
echo "└────────────────────────────────────────────────────┘"
echo ""
echo "┌────────────────────────────────────────────────────┐"
echo "│                      WARNING                       │"
echo "├────────────────────────────────────────────────────┤"
echo "│  Edge functions run in foreground.                 │"
echo "│                                                    │"
echo "│  ▸ Keep this terminal window open at all times     │"
echo "│    while using Wikiadviser app                     │"
echo "│  ▸ Closing it will terminate all the running       │"
echo "│    services                                        │"
echo "└────────────────────────────────────────────────────┘"
echo ""
echo "Running Supabase Edge Functions in the foreground..."
npx supabase functions serve