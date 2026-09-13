// Minimal types for the parts of react-test-renderer the game harness uses.
declare module "react-test-renderer" {
  import type { ReactElement } from "react";

  export interface ReactTestInstance {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: Record<string, any>;
    findAll(
      predicate: (node: ReactTestInstance) => boolean,
    ): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    unmount(): void;
  }

  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): Promise<void>;
}
