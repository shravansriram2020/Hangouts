import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import EventDetailScreen from '../screens/EventDetailScreen';

export default function EventPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <EventDetailScreen
      route={{ params: { eventId: id } }}
      navigation={{
        goBack: () => router.back(),
        navigate: (screen: string, params?: any) => {
          if (screen === 'EventDetail') {
            router.push(`/event/${params.eventId}`);
          }
        },
      }}
    />
  );
}
