import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

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
  host_name: string;
  host_username: string;
  gradient_start: string;
  gradient_end: string;
  image_url: string | null;
  notes: string | null;
  attendees: any[];
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
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      const data = await api.get(`/events/${eventId}`);
      setEvent(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  return (
    <EventContext.Provider value={{ event, loading, error, refreshEvent: fetchEvent }}>
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
