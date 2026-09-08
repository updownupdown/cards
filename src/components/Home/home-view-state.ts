export const NODES_HOME_TAB_INDEX = 3;

export type HomeTabIndex = 0 | 1 | 2 | typeof NODES_HOME_TAB_INDEX;

let activeHomeTab: HomeTabIndex = 0;
const activeHomeTabListeners = new Set<() => void>();

export const getActiveHomeTab = () => activeHomeTab;

export const setActiveHomeTab = (activeTab: HomeTabIndex) => {
  if (activeHomeTab === activeTab) return;
  activeHomeTab = activeTab;
  activeHomeTabListeners.forEach((listener) => listener());
};

export const subscribeActiveHomeTab = (listener: () => void) => {
  activeHomeTabListeners.add(listener);
  return () => activeHomeTabListeners.delete(listener);
};

export const selectNodesHomeTab = () => {
  setActiveHomeTab(NODES_HOME_TAB_INDEX);
};
