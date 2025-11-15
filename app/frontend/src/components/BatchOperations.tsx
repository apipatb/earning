import { useState } from 'react';
import { Check, X, Trash2, Edit2, Download, Tag, Copy, CheckSquare } from 'lucide-react';
import { notify } from '../store/notification.store';

interface BatchOperationsProps {
  selectedItems: Set<string>;
  onClearSelection: () => void;
  onDelete: (ids: string[]) => void;
  onBulkEdit?: (ids: string[], updates: any) => void;
  onExport?: (ids: string[]) => void;
  onTag?: (ids: string[], tag: string) => void;
  onDuplicate?: (ids: string[]) => void;
  itemType?: string;
}

export default function BatchOperations({
  selectedItems,
  onClearSelection,
  onDelete,
  onBulkEdit,
  onExport,
  onTag,
  onDuplicate,
  itemType = 'items',
}: BatchOperationsProps) {
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState<any>({});
  const [tagValue, setTagValue] = useState('');

  const count = selectedItems.size;

  if (count === 0) return null;

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete ${count} ${itemType}? This action cannot be undone.`)) {
      return;
    }

    onDelete(Array.from(selectedItems));
    notify.success('Deleted', `${count} ${itemType} deleted successfully`);
    onClearSelection();
  };

  const handleBulkEdit = () => {
    if (!onBulkEdit) return;

    if (Object.keys(bulkEditFields).length === 0) {
      notify.warning('No Changes', 'Please select fields to update');
      return;
    }

    onBulkEdit(Array.from(selectedItems), bulkEditFields);
    notify.success('Updated', `${count} ${itemType} updated successfully`);
    setShowBulkEdit(false);
    setBulkEditFields({});
    onClearSelection();
  };

  const handleExport = () => {
    if (!onExport) return;

    onExport(Array.from(selectedItems));
    notify.success('Exported', `${count} ${itemType} exported successfully`);
  };

  const handleTag = () => {
    if (!onTag) return;

    if (!tagValue.trim()) {
      notify.warning('Tag Required', 'Please enter a tag value');
      return;
    }

    onTag(Array.from(selectedItems), tagValue);
    notify.success('Tagged', `${count} ${itemType} tagged successfully`);
    setShowTagDialog(false);
    setTagValue('');
    onClearSelection();
  };

  const handleDuplicate = () => {
    if (!onDuplicate) return;

    onDuplicate(Array.from(selectedItems));
    notify.success('Duplicated', `${count} ${itemType} duplicated successfully`);
    onClearSelection();
  };

  return (
    <>
      {/* Batch Operations Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-scale-in">
        <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            <span className="font-medium">
              {count} {count === 1 ? itemType.replace(/s$/, '') : itemType} selected
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/30" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onBulkEdit && (
              <button
                onClick={() => setShowBulkEdit(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Bulk Edit"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}

            {onTag && (
              <button
                onClick={() => setShowTagDialog(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Add Tag"
              >
                <Tag className="w-5 h-5" />
              </button>
            )}

            {onDuplicate && (
              <button
                onClick={handleDuplicate}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Duplicate"
              >
                <Copy className="w-5 h-5" />
              </button>
            )}

            {onExport && (
              <button
                onClick={handleExport}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Export"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-white/30" />

            <button
              onClick={onClearSelection}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Clear Selection"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Edit Dialog */}
      {showBulkEdit && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Edit</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Update {count} {itemType} at once
                </p>
              </div>
              <button
                onClick={() => setShowBulkEdit(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select the fields you want to update. Only the selected fields will be changed.
                </p>

                <div className="space-y-3">
                  {/* Platform */}
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={'platformId' in bulkEditFields}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkEditFields({ ...bulkEditFields, platformId: '' });
                        } else {
                          const { platformId, ...rest } = bulkEditFields;
                          setBulkEditFields(rest);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Platform</div>
                      {('platformId' in bulkEditFields) && (
                        <select
                          value={bulkEditFields.platformId || ''}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, platformId: e.target.value })}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">Select platform...</option>
                          {/* Platform options would be loaded dynamically */}
                        </select>
                      )}
                    </div>
                  </label>

                  {/* Amount Adjustment */}
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={'amountAdjustment' in bulkEditFields}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkEditFields({ ...bulkEditFields, amountAdjustment: { type: 'add', value: 0 } });
                        } else {
                          const { amountAdjustment, ...rest } = bulkEditFields;
                          setBulkEditFields(rest);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Amount Adjustment</div>
                      {('amountAdjustment' in bulkEditFields) && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <select
                            value={bulkEditFields.amountAdjustment?.type || 'add'}
                            onChange={(e) => setBulkEditFields({
                              ...bulkEditFields,
                              amountAdjustment: { ...bulkEditFields.amountAdjustment, type: e.target.value }
                            })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="add">Add</option>
                            <option value="subtract">Subtract</option>
                            <option value="multiply">Multiply by</option>
                            <option value="set">Set to</option>
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            value={bulkEditFields.amountAdjustment?.value || 0}
                            onChange={(e) => setBulkEditFields({
                              ...bulkEditFields,
                              amountAdjustment: { ...bulkEditFields.amountAdjustment, value: parseFloat(e.target.value) }
                            })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Tags */}
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={'tags' in bulkEditFields}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkEditFields({ ...bulkEditFields, tags: '' });
                        } else {
                          const { tags, ...rest } = bulkEditFields;
                          setBulkEditFields(rest);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Tags</div>
                      {('tags' in bulkEditFields) && (
                        <input
                          type="text"
                          value={bulkEditFields.tags || ''}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, tags: e.target.value })}
                          placeholder="tag1, tag2, tag3"
                          className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      )}
                    </div>
                  </label>

                  {/* Notes */}
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={'notes' in bulkEditFields}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkEditFields({ ...bulkEditFields, notes: '' });
                        } else {
                          const { notes, ...rest } = bulkEditFields;
                          setBulkEditFields(rest);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Append to Notes</div>
                      {('notes' in bulkEditFields) && (
                        <textarea
                          value={bulkEditFields.notes || ''}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, notes: e.target.value })}
                          placeholder="Text to append to existing notes..."
                          rows={3}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowBulkEdit(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkEdit}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={Object.keys(bulkEditFields).length === 0}
                >
                  Update {count} {itemType}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Dialog */}
      {showTagDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Tag</h3>
            <input
              type="text"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              placeholder="Enter tag..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleTag()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTagDialog(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleTag}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
