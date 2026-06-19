import { useRef } from "react";
import { View } from "react-native";

type ViewMeasurement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * @deprecated
 */
export function useLayoutManager<T extends string>(initialKeys: T[]) {
  const registry = useRef<Record<T, any>>({} as any).current;
  const refs = useRef<Record<string, View | null>>({});

  const setRef = (key: T, index?: number | string) => (el: View | null) => {
    const rKey = index !== undefined ? `${key}-${index}` : key;
    refs.current[rKey] = el;
    if (el) {
      el.measureInWindow((x, y, width, height) => {
        const data = { x, y, width, height };
        if (index !== undefined) {
          if (!registry[key]) registry[key] = {};
          registry[key][index] = data;
        } else {
          registry[key] = data;
        }
      });
    }
  };

  const getLayout = (key: T, index?: number) => {
    const data = registry[key];
    return index !== undefined
      ? (data?.[index] as ViewMeasurement)
      : (data as ViewMeasurement);
  };

  return { getLayout, setRef };
}
