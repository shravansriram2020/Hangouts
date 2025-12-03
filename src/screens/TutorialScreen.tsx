import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
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
    description: 'Making plans with your friends just got easier.',
    icon: 'heart',
    iconColor: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
  },
  {
    title: 'Coordinate Everything',
    description: 'Coordinate rides, manage money, add notes, and vote on conflicts on Hangout detail pages.',
    icon: 'grid',
    iconColor: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
  },
  {
    title: 'Smart Chat',
    description: 'Communicate through Smart Chat, where Hangouts can detect Location and Time conflicts from natural language.',
    icon: 'chatbubbles',
    iconColor: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  {
    title: "Track Your Friends' ETAs",
    description: "You'll never be questioning how far your friends are from your Hangout.",
    icon: 'navigate',
    iconColor: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    title: 'Share Memories',
    description: 'Upload photos to a group photo album to share the memories! Photos are saved for download for 30 days.',
    icon: 'images',
    iconColor: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  {
    title: "You're All Set!",
    description: 'Start creating hangouts and connecting with friends!',
    icon: 'checkmark-circle',
    iconColor: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
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
            <View style={[styles.iconContainer, { backgroundColor: step.bgColor }]}>
              <Ionicons name={step.icon as any} size={80} color={step.iconColor} />
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
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
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
    paddingHorizontal: 10,
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
