import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EventIndex() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/event/${id}/details`} />;
}
