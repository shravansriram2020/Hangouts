import { Text, TextInput } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';

// Initialize Google Mobile Ads
mobileAds()
  .initialize()
  .then(adapterStatuses => {
    console.log('[AdMob] Initialized successfully');
  })
  .catch(error => {
    console.log('[AdMob] Initialization error:', error);
  });

// Disable font scaling globally BEFORE any components render
// This must execute before expo-router/entry loads any components
// Use multiple approaches for React Native 0.81+ compatibility

// Approach 1: Set defaultProps
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

// Approach 2: Override the render method to force props (for RN 0.81+)
const originalTextRender = Text.render;
if (originalTextRender) {
  Text.render = function(props, ref) {
    return originalTextRender.call(this, {
      ...props,
      allowFontScaling: false,
      maxFontSizeMultiplier: 1,
    }, ref);
  };
}

const originalTextInputRender = TextInput.render;
if (originalTextInputRender) {
  TextInput.render = function(props, ref) {
    return originalTextInputRender.call(this, {
      ...props,
      allowFontScaling: false,
      maxFontSizeMultiplier: 1,
    }, ref);
  };
}

// Now import and start expo-router
import 'expo-router/entry';
