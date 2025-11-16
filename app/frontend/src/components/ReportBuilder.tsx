import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { X, Plus, Filter, ArrowUpDown, GripVertical, Calendar } from 'lucide-react';
import { useReportStore, ReportType } from '../store/reportStore';

interface ReportBuilderProps {
  onPreview: () => void;
}

export default function ReportBuilder({ onPreview }: ReportBuilderProps) {
  const {
    reportConfig,
    availableColumns,
    setReportType,
    addColumn,
    removeColumn,
    reorderColumns,
    addFilter,
    removeFilter,
    updateFilter,
    setSorting,
    updateReportConfig,
  } = useReportStore();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [newFilter, setNewFilter] = useState({ field: '', value: '' });

  const reportType = reportConfig.reportType || 'EARNINGS';
  const selectedColumns = reportConfig.columns || [];
  const filters = reportConfig.filters || {};
  const sorting = reportConfig.sorting || { field: 'date', order: 'desc' as const };

  const availableCols = availableColumns[reportType] || [];
  const unselectedColumns = availableCols.filter(col => !selectedColumns.includes(col));

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    reorderColumns(sourceIndex, destIndex);
  };

  const handleAddFilter = () => {
    if (newFilter.field && newFilter.value) {
      addFilter(newFilter.field, newFilter.value);
      setNewFilter({ field: '', value: '' });
      setShowFilterModal(false);
    }
  };

  const formatFieldName = (field: string): string => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Type
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="EARNINGS">Earnings Report</option>
          <option value="SALES">Sales Report</option>
          <option value="EXPENSES">Expenses Report</option>
          <option value="FINANCIAL">Financial Summary</option>
        </select>
      </div>

      {/* Report Name and Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Name
        </label>
        <input
          type="text"
          value={reportConfig.name || ''}
          onChange={(e) => updateReportConfig({ name: e.target.value })}
          placeholder="My Custom Report"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          value={reportConfig.description || ''}
          onChange={(e) => updateReportConfig({ description: e.target.value })}
          placeholder="Brief description of this report..."
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Column Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Selected Columns
          </label>
          <span className="text-xs text-gray-500">
            Drag to reorder
          </span>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[100px] p-3 border-2 border-dashed rounded-lg $${
                  snapshot.isDraggingOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                }`}
              >
                {selectedColumns.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Add columns from the list below
                  </p>
                ) : (
                  selectedColumns.map((column, index) => (
                    <Draggable key={column} draggableId={column} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-3 mb-2 bg-white border rounded-lg $${
                            snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {formatFieldName(column)}
                            </span>
                          </div>
                          <button
                            onClick={() => removeColumn(column)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Available Columns */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Columns
          </label>
          <div className="flex flex-wrap gap-2">
            {unselectedColumns.map((column) => (
              <button
                key={column}
                onClick={() => addColumn(column)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 rounded-md transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>{formatFieldName(column)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Filters
          </label>
          <button
            onClick={() => setShowFilterModal(true)}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
          >
            <Filter className="w-4 h-4" />
            <span>Add Filter</span>
          </button>
        </div>

        <div className="space-y-2">
          {Object.entries(filters).map(([field, value]) => (
            <div
              key={field}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {formatFieldName(field)}:
                </span>
                <span className="text-sm text-gray-600">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
              <button
                onClick={() => removeFilter(field)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {Object.keys(filters).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No filters applied
            </p>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Filter</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field
                </label>
                <select
                  value={newFilter.field}
                  onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a field</option>
                  {availableCols.map((col) => (
                    <option key={col} value={col}>
                      {formatFieldName(col)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value
                </label>
                <input
                  type="text"
                  value={newFilter.value}
                  onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                  placeholder="Filter value"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleAddFilter}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sorting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort By
        </label>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={sorting.field}
            onChange={(e) => setSorting({ ...sorting, field: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {availableCols.map((col) => (
              <option key={col} value={col}>
                {formatFieldName(col)}
              </option>
            ))}
          </select>
          <select
            value={sorting.order}
            onChange={(e) => setSorting({ ...sorting, order: e.target.value as 'asc' | 'desc' })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Preview Button */}
      <div className="flex justify-end">
        <button
          onClick={onPreview}
          disabled={!reportConfig.name || selectedColumns.length === 0}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>Preview Report</span>
        </button>
      </div>
    </div>
  );
}
