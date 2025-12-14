#!/bin/bash
# Start Expo with tunnel-only mode - forces Expo Go to use exp.direct tunnel URL
(sleep 1; printf '\033[B\n') | npx expo start --host tunnel --tunnel --port 8080 --go --clear
