import { useLayoutEffect, useRef, useState } from "react";

export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const obs = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      const h = box ? box.blockSize : el.getBoundingClientRect().height;
      setHeight(h);
    });

    obs.observe(el);

    // prime height immediately
    setHeight(el.getBoundingClientRect().height);

    return () => obs.disconnect();
  }, []);

  return { ref, height };
}








