'use client';

import axios from 'axios';

export function extractApiMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string' && data.trim()) {
      return data;
    }

    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown; error?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
      if (Array.isArray(message) && message.length > 0) {
        return message.join(', ');
      }

      const nested = (data as { error?: unknown }).error;
      if (typeof nested === 'string' && nested.trim()) {
        return nested;
      }
      if (nested && typeof nested === 'object') {
        const nestedMessage = (nested as { message?: unknown }).message;
        if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
          return nestedMessage;
        }
        if (Array.isArray(nestedMessage) && nestedMessage.length > 0) {
          return nestedMessage.join(', ');
        }
      }
    }
  }

  return fallback;
}
