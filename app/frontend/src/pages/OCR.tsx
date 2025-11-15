import React, { useState, useEffect } from 'react';
import { Upload, FileText, TrendingUp, CheckCircle, AlertCircle, Plus } from 'lucide-react';

const OCR = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Form states
  const [uploadForm, setUploadForm] = useState({
    fileName: '',
    vendorName: '',
    receiptDate: new Date().toISOString().split('T')[0],
  });

  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    totalAmount: '',
    itemCount: '1',
    category: 'uncategorized',
    paymentMethod: 'cash',
    description: '',
  });

  useEffect(() => {
    loadOCRData();
    const interval = setInterval(loadOCRData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadOCRData = async () => {
    setLoading(true);
    try {
      const [receiptsRes, expensesRes, analyticsRes, categoriesRes] = await Promise.all([
        fetch('/api/v1/ocr/receipts'),
        fetch('/api/v1/ocr/expenses'),
        fetch('/api/v1/ocr/analytics'),
        fetch('/api/v1/ocr/categories'),
      ]);

      if (receiptsRes.ok) setReceipts(await receiptsRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (error) {
      console.error('Failed to load OCR data:', error);
    }
    setLoading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // Handle file drop
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/ocr/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...uploadForm,
          fileUrl: 'https://example.com/receipt.jpg',
        }),
      });

      if (res.ok) {
        const receipt = await res.json();
        setSelectedReceipt(receipt);
        setUploadForm({
          fileName: '',
          vendorName: '',
          receiptDate: new Date().toISOString().split('T')[0],
        });
        loadOCRData();
      }
    } catch (error) {
      console.error('Failed to upload receipt:', error);
    }
  };

  const handleProcessReceipt = async (receiptId: string) => {
    try {
      const res = await fetch(`/api/v1/ocr/receipts/${receiptId}/process`, {
        method: 'POST',
      });

      if (res.ok) {
        loadOCRData();
      }
    } catch (error) {
      console.error('Failed to process receipt:', error);
    }
  };

  const handleExtractExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceipt) {
      alert('Please select a receipt first');
      return;
    }

    try {
      const res = await fetch('/api/v1/ocr/extract-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: selectedReceipt.id,
          ...expenseForm,
        }),
      });

      if (res.ok) {
        setExpenseForm({
          totalAmount: '',
          itemCount: '1',
          category: 'uncategorized',
          paymentMethod: 'cash',
          description: '',
        });
        loadOCRData();
      }
    } catch (error) {
      console.error('Failed to extract expense:', error);
    }
  };

  const handleConfirmExpense = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/v1/ocr/expenses/${expenseId}/confirm`, {
        method: 'POST',
      });

      if (res.ok) {
        loadOCRData();
      }
    } catch (error) {
      console.error('Failed to confirm expense:', error);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.icon || '📦';
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || categoryId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Receipt OCR & Expense Extraction
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Scan and extract expenses from receipts automatically
          </p>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Receipts</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {analytics.totalReceipts}
                  </p>
                </div>
                <FileText className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Processing Rate</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {analytics.processingRate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="text-green-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Expenses</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    ${analytics.totalExpenseAmount.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="text-purple-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Avg Expense</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    ${analytics.avgExpenseAmount.toFixed(2)}
                  </p>
                </div>
                <Upload className="text-orange-500" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-0 flex-wrap">
              {[
                { id: 'upload', label: 'Upload Receipt', icon: '📤' },
                { id: 'receipts', label: 'Receipts', icon: '🧾' },
                { id: 'expenses', label: 'Expenses', icon: '💰' },
                { id: 'analytics', label: 'Analytics', icon: '📊' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Upload Receipt
                </h2>

                <form onSubmit={handleUploadReceipt} className="space-y-6">
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <Upload size={40} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      Drag and drop receipt image or click to browse
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Supported formats: PNG, JPG, PDF
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        File Name
                      </label>
                      <input
                        type="text"
                        value={uploadForm.fileName}
                        onChange={(e) =>
                          setUploadForm({ ...uploadForm, fileName: e.target.value })
                        }
                        placeholder="receipt_2024.png"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Vendor Name
                      </label>
                      <input
                        type="text"
                        value={uploadForm.vendorName}
                        onChange={(e) =>
                          setUploadForm({ ...uploadForm, vendorName: e.target.value })
                        }
                        placeholder="e.g., Starbucks"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Receipt Date
                    </label>
                    <input
                      type="date"
                      value={uploadForm.receiptDate}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, receiptDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Upload size={20} /> Upload Receipt
                  </button>
                </form>
              </div>
            )}

            {/* Receipts Tab */}
            {activeTab === 'receipts' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Your Receipts
                </h2>

                <div className="space-y-3">
                  {receipts.length > 0 ? (
                    receipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedReceipt(receipt)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {receipt.vendorName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {receipt.fileName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {new Date(receipt.receiptDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                receipt.status === 'processed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : receipt.status === 'uploaded'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                              }`}
                            >
                              {receipt.status}
                            </span>
                            {receipt.status === 'uploaded' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProcessReceipt(receipt.id);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                              >
                                Process
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No receipts yet
                    </p>
                  )}
                </div>

                {selectedReceipt && (
                  <div className="mt-8 bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                      Extract Expense from Selected Receipt
                    </h3>
                    <form onSubmit={handleExtractExpense} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Total Amount
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={expenseForm.totalAmount}
                            onChange={(e) =>
                              setExpenseForm({
                                ...expenseForm,
                                totalAmount: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category
                          </label>
                          <select
                            value={expenseForm.category}
                            onChange={(e) =>
                              setExpenseForm({
                                ...expenseForm,
                                category: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                      >
                        Extract Expense
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Extracted Expenses
                </h2>

                <div className="space-y-3">
                  {expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <div key={expense.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">
                                {getCategoryIcon(expense.category)}
                              </span>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {getCategoryName(expense.category)}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {expense.description}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              ${expense.totalAmount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Confidence: {(expense.confidence * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        {!expense.confirmed && (
                          <button
                            onClick={() => handleConfirmExpense(expense.id)}
                            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No expenses extracted yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Receipt Analytics
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Expense Distribution
                    </h3>
                    <div className="space-y-3">
                      {analytics.expensesByCategory.map((cat: any) => (
                        <div key={cat.category} className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 capitalize">
                            {cat.category}
                          </span>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">
                              ${cat._sum.totalAmount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {cat._count} items
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Processing Statistics
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total Uploaded
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {analytics.totalReceipts}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Processing Rate
                        </p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {analytics.processingRate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Avg Processing Time
                        </p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ~2.5s
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCR;
