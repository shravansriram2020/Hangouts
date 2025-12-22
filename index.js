import { Text, TextInput } from 'react-native';

// Disable font scaling globally BEFORE any components render
// This must execute before expo-router/entry loads any components
if (Text.defaultProps == null) {
  Text.defaultProps = {};
}
Text.defaultProps.allowFontScaling = false;
Text.defaultProps.maxFontSizeMultiplier = 1;

if (TextInput.defaultProps == null) {
  TextInput.defaultProps = {};
}
TextInput.defaultProps.allowFontScaling = false;
TextInput.defaultProps.maxFontSizeMultiplier = 1;

// Now import and start expo-router
import 'expo-router/entry';
