export const HOME_HOME_TAB_INDEX = 0;
export const NODES_HOME_TAB_INDEX = 1;
export const COLLECT_HOME_TAB_INDEX = 2;
export const SEARCH_HOME_TAB_INDEX = 3;
export const LAST_HOME_TAB_INDEX = SEARCH_HOME_TAB_INDEX;

export type HomeTabIndex =
  | typeof HOME_HOME_TAB_INDEX
  | typeof NODES_HOME_TAB_INDEX
  | typeof COLLECT_HOME_TAB_INDEX
  | typeof SEARCH_HOME_TAB_INDEX;

let activeHomeTab: HomeTabIndex = HOME_HOME_TAB_INDEX;
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

/** A category the Collect tab should open (and scroll to) when it next shows. */
let pendingCollectTag: string | null = null;

export const requestCollectTag = (tag: string) => {
  pendingCollectTag = tag;
};

export const getPendingCollectTag = () => pendingCollectTag;

export const clearPendingCollectTag = () => {
  pendingCollectTag = null;
};
