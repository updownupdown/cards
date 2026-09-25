// Minimal types for the parts of react-test-renderer the game harness uses.
declare module "react-test-renderer" {
  import type { ComponentType, ReactElement } from "react";

  export interface ReactTestInstance {
    /** A host component's tag ("View"), or the component itself. */
    type: string | ComponentType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: Record<string, any>;
    parent: ReactTestInstance | null;
    findAll(
      predicate: (node: ReactTestInstance) => boolean,
    ): ReactTestInstance[];
    find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance;
    findAllByType(type: ComponentType): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    toJSON(): unknown;
    update(element: ReactElement): void;
    unmount(): void;
  }

  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): Promise<void>;
}
