import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

import SignInScreen from '../src/screens/SignInScreen';
import SignUpScreen from '../src/screens/SignUpScreen';
import TutorialScreen from '../src/screens/TutorialScreen';
import HomeScreen from '../src/screens/HomeScreen';

export default function Index() {
  const router = useRouter();
  const { user, loading, updateUser } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  React.useEffect(() => {
    if (user && !user.tutorialCompleted) {
      setShowTutorial(true);
    }
  }, [user]);

  if (loading) {
    return <View style={styles.container} />;
  }

  if (!user) {
    if (showSignUp) {
      return <SignUpScreen onSwitchToSignIn={() => setShowSignUp(false)} />;
    }
    return <SignInScreen onSwitchToSignUp={() => setShowSignUp(true)} />;
  }

  if (showTutorial) {
    return (
      <TutorialScreen
        onComplete={() => {
          setShowTutorial(false);
          updateUser({ tutorialCompleted: true });
        }}
      />
    );
  }

  return (
    <HomeScreen
      navigation={{
        navigate: (screen: string, params?: any) => {
          if (screen === 'EventDetail') {
            router.push(`/event/${params.eventId}`);
          }
        },
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
