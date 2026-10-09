import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

type AsyncResource<T> = {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  isLoading: boolean;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  reload: () => void;
};

export function useAsyncResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  initialData: T,
  fallbackError: string,
): AsyncResource<T> {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void load(controller.signal)
      .then((nextData) => {
        if (!controller.signal.aborted) setData(nextData);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : fallbackError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [fallbackError, load, reloadKey]);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError('');
    setReloadKey((current) => current + 1);
  }, []);

  return { data, setData, isLoading, error, setError, reload };
}
