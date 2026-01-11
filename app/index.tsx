import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Colors } from '../constants/theme';

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
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [preloadedEvents, setPreloadedEvents] = useState<any[]>([]);
  const [preloadedArchivedEvents, setPreloadedArchivedEvents] = useState<any[]>([]);
  const [preloadedUnreadCount, setPreloadedUnreadCount] = useState(0);
  const previousUser = useRef<string | null>(null);

  useEffect(() => {
    if (user && !user.tutorialCompleted) {
      setShowTutorial(true);
    }
  }, [user]);

  useEffect(() => {
    if (user && !loading) {
      const isNewSignIn = previousUser.current === null && user.id;
      if (isNewSignIn || !eventsLoaded) {
        setLoadingEvents(true);
        preloadEvents();
      }
      previousUser.current = user.id;
    } else if (!user && !loading) {
      previousUser.current = null;
      setEventsLoaded(false);
      setPreloadedEvents([]);
      setPreloadedArchivedEvents([]);
      setPreloadedUnreadCount(0);
    }
  }, [user, loading]);

  useEffect(() => {
    if (animationComplete && (eventsLoaded || !user)) {
      setShowSplash(false);
    }
  }, [animationComplete, eventsLoaded, user]);

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
      setLoadingEvents(false);
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

  if (loadingEvents || !eventsLoaded) {
    return (
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>Loading your hangouts...</Text>
      </LinearGradient>
    );
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
});
