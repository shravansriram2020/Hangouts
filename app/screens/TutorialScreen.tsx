import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

const tutorialSteps = [
  {
    title: 'Welcome to Hangouts!',
    description: 'The easiest way to plan and coordinate events with your friends.',
    icon: 'calendar-outline',
  },
  {
    title: 'Create Hangouts',
    description: 'Plan events with custom details, locations, and invite your friends to join.',
    icon: 'add-circle-outline',
  },
  {
    title: 'Coordinate Rides',
    description: 'Offer or request rides to events. See who can drive and carpool together.',
    icon: 'car-outline',
  },
  {
    title: 'Split Costs',
    description: 'Request and track money between friends. Keep expenses organized.',
    icon: 'cash-outline',
  },
  {
    title: 'Live Location',
    description: 'Share your location with friends. See ETAs and who is on their way.',
    icon: 'location-outline',
  },
  {
    title: 'Report Conflicts',
    description: "Can't make the time or location? Report conflicts and vote on changes.",
    icon: 'alert-circle-outline',
  },
  {
    title: 'Share Photos',
    description: 'Upload and share photos with your group. Access them for 30 days.',
    icon: 'images-outline',
  },
  {
    title: "You're All Set!",
    description: 'Start creating hangouts and connecting with friends!',
    icon: 'checkmark-circle-outline',
  },
];

export default function TutorialScreen({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollRef.current?.scrollTo({
        x: (currentStep + 1) * width,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await api.put('/users/tutorial-complete', {});
    } catch (error) {
      console.error('Failed to mark tutorial complete:', error);
    }
    onComplete();
  };

  const handleScroll = (event: any) => {
    const step = Math.round(event.nativeEvent.contentOffset.x / width);
    if (step !== currentStep) {
      setCurrentStep(step);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.container}
    >
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {tutorialSteps.map((step, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.iconContainer}>
              <Ionicons name={step.icon as any} size={100} color={Colors.secondary} />
            </View>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {tutorialSteps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentStep && styles.activeDot,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
        </Text>
        <Ionicons
          name={currentStep === tutorialSteps.length - 1 ? 'checkmark' : 'arrow-forward'}
          size={20}
          color={Colors.white}
        />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Medium',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    color: Colors.secondary,
    fontFamily: 'Prompt-Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Prompt-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(30, 58, 95, 0.3)',
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: Colors.secondary,
    width: 24,
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    marginHorizontal: 24,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    color: Colors.white,
    fontFamily: 'Prompt-SemiBold',
    marginRight: 8,
  },
});
