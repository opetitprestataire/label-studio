import { render, waitFor } from '@testing-library/react';
import { PlaygroundApp } from '../PlaygroundApp';
import { useAtom, useSetAtom } from 'jotai';
import { configAtom, errorAtom, loadingAtom } from '../../../atoms/configAtoms';

// Mock CodeEditor and allow it to be spied on
jest.mock('../../EditorPanel', () => ({
  EditorPanel: () => <div>EditorPanel</div>,
}));
jest.mock('../../PreviewPanel', () => ({
  PreviewPanel: () => <div>PreviewPanel</div>,
}));
jest.mock("@humansignal/ui", () => ({
  ThemeToggle: () => <div>ThemeToggle</div>,
}));

// Mock the atoms
jest.mock('jotai', () => {
  const originalModule = jest.requireActual('jotai');
  return {
    ...originalModule,
    useAtom: jest.fn(),
    useSetAtom: jest.fn(),
  };
});

// Mock the fetch function
global.fetch = jest.fn();

describe('PlaygroundApp', () => {
  const mockSetConfig = jest.fn();
  const mockSetError = jest.fn();
  const mockSetLoading = jest.fn();
  const mockSetInterfaces = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtom as jest.Mock).mockImplementation((atom) => {
      if (atom === configAtom) return ['', mockSetConfig];
      if (atom === errorAtom) return ['', mockSetError];
      if (atom === loadingAtom) return [false, mockSetLoading];
      return [null, mockSetInterfaces];
    });
    (useSetAtom as jest.Mock).mockImplementation((atom) => {
      if (atom === configAtom) return mockSetConfig;
      if (atom === errorAtom) return mockSetError;
      if (atom === loadingAtom) return mockSetLoading;
      return mockSetInterfaces;
    });

    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost'),
      writable: true,
      configurable: true,
    });
  });

  it('should handle config parameter in URL', async () => {
    // Mock URL with config parameter
    const mockConfig = '<View><Text name="text" value="$text"/></View>';
    const encodedConfig = encodeURIComponent(mockConfig.replace(/\n/g, '<br>'));
    Object.defineProperty(window, 'location', {
      value: new URL(`http://localhost?config=${encodedConfig}`),
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetConfig).toHaveBeenCalledWith(mockConfig);
      expect(mockSetError).not.toHaveBeenCalled();
    });
  });

  it('should handle invalid config parameter', async () => {
    // Mock URL with invalid config parameter that will cause decodeURIComponent to fail
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost?config=invalid%config'),
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Failed to decode config. Are you sure it\'s a valid urlencoded string?');
    });
  });

  it('should handle configUrl parameter', async () => {
    // Mock URL with configUrl parameter
    const mockConfig = '<View><Text name="text" value="$text"/></View>';
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost?configUrl=http://example.com/config.xml'),
      writable: true,
      configurable: true,
    });

    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockConfig),
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetConfig).toHaveBeenCalledWith(mockConfig);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should handle failed configUrl fetch', async () => {
    // Mock URL with configUrl parameter
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost?configUrl=http://example.com/config.xml'),
      writable: true,
      configurable: true,
    });

    // Mock failed fetch response
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Failed to fetch config from URL.');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should handle non-200 configUrl response', async () => {
    // Mock URL with configUrl parameter
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost?configUrl=http://example.com/config.xml'),
      writable: true,
      configurable: true,
    });

    // Mock non-200 fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Failed to fetch config from URL.');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should handle interfaces parameter', async () => {
    // Mock URL with interfaces parameter
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost?interfaces=skip,submit'),
      writable: true,
      configurable: true,
    });

    render(<PlaygroundApp />);

    await waitFor(() => {
      expect(mockSetInterfaces).toHaveBeenCalledWith(['skip', 'submit']);
    });
  });
});
