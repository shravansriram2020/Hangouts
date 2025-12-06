#!/bin/bash
# Start Expo in Expo Go mode with tunnel
(sleep 1; printf '\033[B\n') | npx expo start --tunnel --port 8080 --go
