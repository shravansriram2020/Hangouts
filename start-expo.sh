#!/bin/bash
# Start Expo selecting "Proceed anonymously"
(sleep 1; printf '\033[B\n') | npx expo start --tunnel --port 5000
