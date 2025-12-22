import React from 'react';
import { Text as RNText, TextProps, TextInput as RNTextInput, TextInputProps } from 'react-native';

export function Text(props: TextProps) {
  return (
    <RNText
      {...props}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
    />
  );
}

export function TextInput(props: TextInputProps) {
  return (
    <RNTextInput
      {...props}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
    />
  );
}

export default Text;
