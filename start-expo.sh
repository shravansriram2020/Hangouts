#!/bin/bash
# Start Expo with tunnel mode for Expo Go testing
(sleep 1; printf '\033[B\n') | npx expo start --tunnel --port 8080 --go --clear
