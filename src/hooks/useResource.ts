import { useEffect, useState } from "react";
import { api } from "../services/api";
export function useResource<T>(path: string, revision = 0) {
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ data: null, error: null, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            data: null,
            error: error.message || "Unable to connect. Please retry.",
            loading: false,
          });
      });
    return () => controller.abort();
  }, [path, revision]);
  return state;
}
