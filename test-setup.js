import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from "util";
import { webcrypto } from "crypto";
import { mockFetch } from './tests/utils/mockFetch';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

Object.defineProperty(global.self, "crypto", {
  value: {
    subtle: webcrypto.subtle,
  },
});

global.fetch = mockFetch;
global.jest = jest;