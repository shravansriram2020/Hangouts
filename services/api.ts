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
        if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<HTML')) {
          throw new Error('Server is temporarily unavailable. Please try again later.');
        }
        throw new Error('Unable to connect to server. Please try again later.');
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

  async patch(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async uploadFormData(endpoint: string, formData: FormData) {
    const headers: HeadersInit = {};

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('[API] Upload:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[API] Non-JSON response:', text);
        throw new Error('Upload failed. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error: any) {
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        throw new Error('Unable to upload. Please check your connection.');
      }
      throw error;
    }
  }
}

export const api = new ApiService();
