import { useState } from 'react';
import { Filter, Plus, X, ChevronDown, Save, Trash2, Calendar, DollarSign, Tag } from 'lucide-react';

// Field type definitions
export type FieldType = 'text' | 'number' | 'date' | 'select';

// Operator type definitions
export type FilterOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';

// Filter value can be string, number, or array of strings for 'in' operator
export type FilterValue = string | number | string[];

// Field option structure
export interface FieldOption {
  value: string;
  label: string;
}

// Field definition structure
export interface FilterField {
  value: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
}

// Operator option structure
export interface OperatorOption {
  value: FilterOperator;
  label: string;
}

// Operators map type
export type OperatorsMap = {
  [K in FieldType]: OperatorOption[];
};

// Filter rule structure
export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: FilterValue;
  value2?: FilterValue; // For 'between' operator
}

// Filter group structure
export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  rules: FilterRule[];
}

// Saved filter structure
export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  groups: FilterGroup[];
  createdAt: string;
}

// Component props interface
interface AdvancedFiltersProps {
  fields: FilterField[];
  onApplyFilters: (groups: FilterGroup[]) => void;
  storageKey?: string;
}

export default function AdvancedFilters({ fields, onApplyFilters, storageKey = 'advanced_filters' }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([
    {
      id: `group-${Date.now()}`,
      logic: 'AND',
      rules: [],
    },
  ]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');

  const operators: OperatorsMap = {
    text: [
      { value: 'equals', label: 'Equals' },
      { value: 'notEquals', label: 'Not Equals' },
      { value: 'contains', label: 'Contains' },
    ],
    number: [
      { value: 'equals', label: 'Equals' },
      { value: 'notEquals', label: 'Not Equals' },
      { value: 'greaterThan', label: 'Greater Than' },
      { value: 'lessThan', label: 'Less Than' },
      { value: 'between', label: 'Between' },
    ],
    date: [
      { value: 'equals', label: 'On' },
      { value: 'greaterThan', label: 'After' },
      { value: 'lessThan', label: 'Before' },
      { value: 'between', label: 'Between' },
    ],
    select: [
      { value: 'equals', label: 'Is' },
      { value: 'notEquals', label: 'Is Not' },
      { value: 'in', label: 'In' },
    ],
  };

  const addGroup = () => {
    setFilterGroups([
      ...filterGroups,
      {
        id: `group-${Date.now()}`,
        logic: 'AND',
        rules: [],
      },
    ]);
  };

  const removeGroup = (groupId: string) => {
    setFilterGroups(filterGroups.filter(g => g.id !== groupId));
  };

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    setFilterGroups(
      filterGroups.map(g => (g.id === groupId ? { ...g, logic } : g))
    );
  };

  const addRule = (groupId: string) => {
    setFilterGroups(
      filterGroups.map(g =>
        g.id === groupId
          ? {
              ...g,
              rules: [
                ...g.rules,
                {
                  id: `rule-${Date.now()}`,
                  field: fields[0].value,
                  operator: 'equals',
                  value: '',
                },
              ],
            }
          : g
      )
    );
  };

  const removeRule = (groupId: string, ruleId: string) => {
    setFilterGroups(
      filterGroups.map(g =>
        g.id === groupId
          ? { ...g, rules: g.rules.filter(r => r.id !== ruleId) }
          : g
      )
    );
  };

  const updateRule = (groupId: string, ruleId: string, updates: Partial<FilterRule>) => {
    setFilterGroups(
      filterGroups.map(g =>
        g.id === groupId
          ? {
              ...g,
              rules: g.rules.map(r =>
                r.id === ruleId ? { ...r, ...updates } : r
              ),
            }
          : g
      )
    );
  };

  const handleApplyFilters = () => {
    onApplyFilters(filterGroups);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setFilterGroups([
      {
        id: `group-${Date.now()}`,
        logic: 'AND',
        rules: [],
      },
    ]);
    onApplyFilters([]);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      return;
    }

    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: filterName,
      description: filterDescription,
      groups: filterGroups,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    setShowSaveDialog(false);
    setFilterName('');
    setFilterDescription('');
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    setFilterGroups(filter.groups);
  };

  const handleDeleteSavedFilter = (filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const getFieldType = (fieldValue: string) => {
    return fields.find(f => f.value === fieldValue)?.type || 'text';
  };

  const getFieldOptions = (fieldValue: string) => {
    return fields.find(f => f.value === fieldValue)?.options || [];
  };

  const activeFiltersCount = filterGroups.reduce((count, group) => count + group.rules.length, 0);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeFiltersCount > 0
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Advanced Filters</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 bg-white dark:bg-gray-900 rounded-full text-xs font-bold">
            {activeFiltersCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Filter className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Advanced Filters</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Create complex filter rules to find exactly what you need
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Saved Filters</h3>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map(filter => (
                <div
                  key={filter.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <button
                    onClick={() => handleLoadFilter(filter)}
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {filter.name}
                  </button>
                  <button
                    onClick={() => handleDeleteSavedFilter(filter.id)}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Groups */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filterGroups.map((group, groupIndex) => (
            <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {groupIndex > 0 && (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">AND</span>
                  )}
                  <select
                    value={group.logic}
                    onChange={(e) => updateGroupLogic(group.id, e.target.value as 'AND' | 'OR')}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="AND">All of</option>
                    <option value="OR">Any of</option>
                  </select>
                  <span className="text-sm text-gray-600 dark:text-gray-400">these rules:</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addRule(group.id)}
                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {filterGroups.length > 1 && (
                    <button
                      onClick={() => removeGroup(group.id)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {group.rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  No rules yet. Click + to add a rule.
                </div>
              ) : (
                <div className="space-y-2">
                  {group.rules.map((rule, ruleIndex) => {
                    const fieldType = getFieldType(rule.field);
                    const fieldOptions = getFieldOptions(rule.field);

                    return (
                      <div key={rule.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg">
                        {ruleIndex > 0 && (
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                            {group.logic}
                          </span>
                        )}

                        {/* Field */}
                        <select
                          value={rule.field}
                          onChange={(e) => updateRule(group.id, rule.id, { field: e.target.value, value: '' })}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {fields.map(field => (
                            <option key={field.value} value={field.value}>{field.label}</option>
                          ))}
                        </select>

                        {/* Operator */}
                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(group.id, rule.id, { operator: e.target.value as FilterOperator })}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {operators[fieldType].map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>

                        {/* Value */}
                        {fieldType === 'select' ? (
                          <select
                            value={rule.value}
                            onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select...</option>
                            {fieldOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={fieldType === 'date' ? 'date' : fieldType === 'number' ? 'number' : 'text'}
                            value={rule.value}
                            onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
                            placeholder="Value"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        )}

                        {/* Second value for 'between' operator */}
                        {rule.operator === 'between' && (
                          <>
                            <span className="text-sm text-gray-500 dark:text-gray-400">and</span>
                            <input
                              type={fieldType === 'date' ? 'date' : fieldType === 'number' ? 'number' : 'text'}
                              value={rule.value2 || ''}
                              onChange={(e) => updateRule(group.id, rule.id, { value2: e.target.value })}
                              placeholder="Value 2"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </>
                        )}

                        {/* Remove */}
                        <button
                          onClick={() => removeRule(group.id, rule.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addGroup}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Filter Group</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Clear All
              </button>
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Filter
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Save Filter</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Filter Name
                </label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="My Custom Filter"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={filterDescription}
                  onChange={(e) => setFilterDescription(e.target.value)}
                  placeholder="What does this filter do?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFilter}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
