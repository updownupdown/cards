export type HomeTabIndex = 0 | 1 | 2 | 3 | 4;

let activeHomeTab: HomeTabIndex = 0;

export const getActiveHomeTab = () => activeHomeTab;

export const setActiveHomeTab = (activeTab: HomeTabIndex) => {
  activeHomeTab = activeTab;
};
