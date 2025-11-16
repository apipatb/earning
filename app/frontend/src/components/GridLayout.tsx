import { ReactNode } from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ReactGridLayout = WidthProvider(RGL);

interface Widget {
  id: string;
  positionX: number;
  positionY: number;
  sizeW: number;
  sizeH: number;
}

interface GridLayoutProps {
  widgets: Widget[];
  children: ReactNode;
  editMode: boolean;
  onLayoutChange: (layout: Layout[]) => void;
  cols?: number;
  rowHeight?: number;
}

export default function GridLayout({
  widgets,
  children,
  editMode,
  onLayoutChange,
  cols = 12,
  rowHeight = 100,
}: GridLayoutProps) {
  // Convert widgets to layout format
  const layout: Layout[] = widgets.map(widget => ({
    i: widget.id,
    x: widget.positionX,
    y: widget.positionY,
    w: widget.sizeW,
    h: widget.sizeH,
    minW: 2,
    minH: 2,
  }));

  return (
    <ReactGridLayout
      className="layout"
      layout={layout}
      cols={cols}
      rowHeight={rowHeight}
      isDraggable={editMode}
      isResizable={editMode}
      onLayoutChange={onLayoutChange}
      draggableHandle=".drag-handle"
      compactType="vertical"
      preventCollision={false}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      useCSSTransforms={true}
    >
      {children}
    </ReactGridLayout>
  );
}
