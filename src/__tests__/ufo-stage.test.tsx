import {
  TabShownContext,
  UfoStageProvider,
  useUfoOnScreen,
  useUfoStage,
} from "@/components/common/UfoStage";
import { describe, expect, test } from "@jest/globals";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

// The tab bar's UFO hovers only while this count is zero: the one-UFO rule.
let seen = -1;
function Count() {
  seen = useUfoStage().count;
  return null;
}
function Ufo({ on }: { on: boolean }) {
  useUfoOnScreen(on);
  return null;
}

function render(ufos: { on: boolean; tabShown: boolean }[]) {
  return (
    <UfoStageProvider>
      {ufos.map(({ on, tabShown }, index) => (
        <TabShownContext.Provider key={index} value={tabShown}>
          <Ufo on={on} />
        </TabShownContext.Provider>
      ))}
      <Count />
    </UfoStageProvider>
  );
}

describe("UfoStage", () => {
  test("counts the UFOs on screen, in shown tabs only", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(render([{ on: true, tabShown: true }]));
    });
    expect(seen).toBe(1);
    act(() => {
      renderer.update(
        render([
          { on: true, tabShown: false },
          { on: false, tabShown: true },
        ]),
      );
    });
    expect(seen).toBe(0);
    act(() => renderer.unmount());
  });
});
