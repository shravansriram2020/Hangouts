import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

import SignInScreen from '../src/screens/SignInScreen';
import SignUpScreen from '../src/screens/SignUpScreen';
import TutorialScreen from '../src/screens/TutorialScreen';
import HomeScreen from '../src/screens/HomeScreen';
import SplashAnimation from '../src/components/SplashAnimation';

export default function Index() {
  const router = useRouter();
  const { user, loading, updateUser } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [preloadedEvents, setPreloadedEvents] = useState<any[]>([]);
  const [preloadedArchivedEvents, setPreloadedArchivedEvents] = useState<any[]>([]);
  const [preloadedUnreadCount, setPreloadedUnreadCount] = useState(0);

  useEffect(() => {
    if (user && !user.tutorialCompleted) {
      setShowTutorial(true);
    }
  }, [user]);

  useEffect(() => {
    if (user && !loading) {
      preloadEvents();
    } else if (!user && !loading) {
      setEventsLoaded(true);
    }
  }, [user, loading]);

  useEffect(() => {
    if (animationComplete && eventsLoaded) {
      setShowSplash(false);
    }
  }, [animationComplete, eventsLoaded]);

  const preloadEvents = async () => {
    try {
      const [eventsData, archivedData, unreadData] = await Promise.all([
        api.get('/events'),
        api.get('/events/archived'),
        api.get('/notifications/unread-count'),
      ]);
      setPreloadedEvents(eventsData);
      setPreloadedArchivedEvents(archivedData);
      setPreloadedUnreadCount(unreadData.count);
    } catch (error) {
      console.error('Failed to preload events:', error);
    } finally {
      setEventsLoaded(true);
    }
  };

  if (showSplash) {
    return <SplashAnimation onAnimationComplete={() => setAnimationComplete(true)} />;
  }

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
      initialEvents={preloadedEvents}
      initialArchivedEvents={preloadedArchivedEvents}
      initialUnreadCount={preloadedUnreadCount}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
