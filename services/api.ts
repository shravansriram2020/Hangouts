import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  // Check environment variable first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Check app.json extra config
  const configApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configApiUrl) {
    return configApiUrl;
  }
  
  if (Platform.OS === 'web') {
    return '/api';
  }
  
  // Development: use debugger host
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:5000/api`;
  }
  
  // Production fallback
  return 'https://api.hangouts-app.com/api';
};

const API_BASE_URL = getApiUrl();

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('[API] Request:', url);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[API] Non-JSON response:', text);
        throw new Error(`Server error: ${text || 'Unable to connect to server'}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error: any) {
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        console.error('[API] Network error - API URL:', API_BASE_URL);
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      throw error;
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint);
  }

  async post(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
