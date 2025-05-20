import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from "util";
import { mockFetch } from './tests/utils/mockFetch';
import crypto from 'crypto';

Object.defineProperty(globalThis, 'crypto', {
  value: {
    ...crypto,
  }
});

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.fetch = mockFetch;
global.jest = jest;