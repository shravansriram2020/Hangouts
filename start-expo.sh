#!/bin/bash
# Start Expo in development build mode with tunnel
(sleep 1; printf '\033[B\n') | npx expo start --tunnel --port 8080 --dev-client --clear
