import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetType =
  | 'earnings-summary'
  | 'recent-earnings'
  | 'top-platforms'
  | 'goals-progress'
  | 'monthly-trend'
  | 'quick-stats';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
}

interface WidgetStore {
  widgets: Widget[];
  editMode: boolean;
  toggleEditMode: () => void;
  toggleWidget: (id: string) => void;
  reorderWidgets: (widgets: Widget[]) => void;
  resetToDefault: () => void;
}

const defaultWidgets: Widget[] = [
  {
    id: 'earnings-summary',
    type: 'earnings-summary',
    title: 'Earnings Summary',
    enabled: true,
    order: 0,
    size: 'large',
  },
  {
    id: 'recent-earnings',
    type: 'recent-earnings',
    title: 'Recent Earnings',
    enabled: true,
    order: 1,
    size: 'medium',
  },
  {
    id: 'top-platforms',
    type: 'top-platforms',
    title: 'Top Platforms',
    enabled: true,
    order: 2,
    size: 'medium',
  },
  {
    id: 'goals-progress',
    type: 'goals-progress',
    title: 'Goals Progress',
    enabled: true,
    order: 3,
    size: 'medium',
  },
  {
    id: 'monthly-trend',
    type: 'monthly-trend',
    title: 'Monthly Trend',
    enabled: true,
    order: 4,
    size: 'large',
  },
  {
    id: 'quick-stats',
    type: 'quick-stats',
    title: 'Quick Stats',
    enabled: true,
    order: 5,
    size: 'small',
  },
];

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set) => ({
      widgets: defaultWidgets,
      editMode: false,
      toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
      toggleWidget: (id: string) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w
          ),
        })),
      reorderWidgets: (widgets: Widget[]) => set({ widgets }),
      resetToDefault: () => set({ widgets: defaultWidgets, editMode: false }),
    }),
    {
      name: 'earntrack-widgets',
    }
  )
);
