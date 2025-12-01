import { useState, useRef, useCallback } from 'react';
import { api } from '../../services/api';

export interface UserSearchResult {
  id: string;
  username: string;
  firstName: string;
  profilePhoto: string | null;
}

interface UseUserSearchOptions {
  excludeIds?: string[];
  debounceMs?: number;
  minQueryLength?: number;
}

export function useUserSearch(options: UseUserSearchOptions = {}) {
  const {
    excludeIds = [],
    debounceMs = 300,
    minQueryLength = 1,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rawResults = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
      const filtered = rawResults.filter((u: UserSearchResult) => !excludeIds.includes(u.id));
      setResults(filtered);
    } catch (error) {
      console.error('User search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [excludeIds, minQueryLength]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (!text || text.length < minQueryLength) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeout.current = setTimeout(() => {
      searchUsers(text);
    }, debounceMs);
  }, [searchUsers, debounceMs, minQueryLength]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setLoading(false);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  }, []);

  const removeFromResults = useCallback((userId: string) => {
    setResults(prev => prev.filter(u => u.id !== userId));
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    results,
    loading,
    clearSearch,
    removeFromResults,
  };
}
