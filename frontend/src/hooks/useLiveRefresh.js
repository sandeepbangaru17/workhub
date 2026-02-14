import { useEffect, useState } from "react";
import { subscribeToLiveUpdates } from "../api";

export function useLiveRefresh(enabled = true) {
  const [version, setVersion] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const stop = subscribeToLiveUpdates(
      () => {
        setLive(true);
        setVersion((v) => v + 1);
      },
      () => {
        setLive(false);
      }
    );

    return stop;
  }, [enabled]);

  return { version, live };
}
