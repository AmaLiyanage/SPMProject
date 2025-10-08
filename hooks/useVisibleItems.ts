import { useState, useRef, useCallback } from 'react';
import { ViewToken } from 'react-native';

export interface VisibleItem {
  key: string;
  isViewable: boolean;
  index?: number;
}

export const useVisibleItems = () => {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const newVisibleItems = new Set<string>();
      
      viewableItems.forEach((item) => {
        if (item.isViewable && item.key) {
          newVisibleItems.add(item.key);
        }
      });
      
      setVisibleItems(newVisibleItems);
    },
    []
  );

  const isItemVisible = useCallback(
    (itemKey: string) => visibleItems.has(itemKey),
    [visibleItems]
  );

  return {
    visibleItems,
    isItemVisible,
    onViewableItemsChanged,
    viewabilityConfig,
  };
};