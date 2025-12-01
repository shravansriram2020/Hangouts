import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface Note {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  first_name: string;
  profile_photo?: string;
}

interface Attendee {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_photo?: string;
  status: string;
  is_on_my_way: boolean;
  location_sharing: boolean;
  current_lat?: number;
  current_lng?: number;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location_name: string;
  location_address: string;
  location_lat: number | null;
  location_lng: number | null;
  host_id: string;
  host_first_name: string;
  host_last_name: string;
  host_username: string;
  host_photo?: string;
  gradient_color1: string;
  gradient_color2: string;
  event_image: string | null;
  notes: Note[];
  attendees: Attendee[];
  isHost: boolean;
}

interface EventContextType {
  event: EventData | null;
  loading: boolean;
  error: string | null;
  refreshEvent: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ 
  children, 
  eventId 
}: { 
  children: React.ReactNode; 
  eventId: string;
}) {
  const { loading: authLoading, token } = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/events/${eventId}`);
      setEvent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && eventId) {
      fetchEvent();
    }
  }, [eventId, authLoading, token]);

  return (
    <EventContext.Provider value={{ event, loading: loading || authLoading, error, refreshEvent: fetchEvent }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
