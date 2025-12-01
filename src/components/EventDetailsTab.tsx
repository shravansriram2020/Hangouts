import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export default function EventDetailsTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Event Details</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
  },
});
