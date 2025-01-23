export const mockFetch = jest.fn();

export const mockFetchHandler = (responses = {}) => {
  return (url, options) => {
    if (responses[url]) {
      return Promise.resolve(responses[url]);
    }

    return Promise.reject(new Error(`Unhandled fetch to ${url}`));
  };
};

export const setupMockFetch = (responses) => {
  mockFetch.mockImplementation(mockFetchHandler(responses));
};

export const resetMockFetch = () => {
  jest.clearAllMocks();
};
