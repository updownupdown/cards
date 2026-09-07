export const NODES_HOME_TAB_INDEX = 3;

export type HomeTabIndex = 0 | 1 | 2 | typeof NODES_HOME_TAB_INDEX;

let activeHomeTab: HomeTabIndex = 0;

export const getActiveHomeTab = () => activeHomeTab;

export const setActiveHomeTab = (activeTab: HomeTabIndex) => {
  activeHomeTab = activeTab;
};

export const selectNodesHomeTab = () => {
  setActiveHomeTab(NODES_HOME_TAB_INDEX);
};
