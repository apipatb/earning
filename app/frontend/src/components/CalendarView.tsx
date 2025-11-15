import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, Plus } from 'lucide-react';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  earnings: any[];
  totalAmount: number;
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    generateCalendar();
  }, [currentDate]);

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get start of week for first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Get end of week for last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    // Load earnings
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');

    // Generate calendar days
    const days: CalendarDay[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEarnings = earnings.filter((e: any) => e.date.startsWith(dateStr));
      const totalAmount = dayEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        earnings: dayEarnings,
        totalAmount,
      });

      current.setDate(current.getDate() + 1);
    }

    setCalendarDays(days);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const now = new Date();
    return date.toDateString() === now.toDateString();
  };

  const getIntensityClass = (amount: number) => {
    if (amount === 0) return 'bg-gray-50 dark:bg-gray-800';
    if (amount < 50) return 'bg-green-100 dark:bg-green-900/30';
    if (amount < 200) return 'bg-green-300 dark:bg-green-700/50';
    if (amount < 500) return 'bg-green-500 dark:bg-green-600/70';
    return 'bg-green-700 dark:bg-green-500';
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthTotal = calendarDays
    .filter(d => d.isCurrentMonth)
    .reduce((sum, d) => sum + d.totalAmount, 0);

  const monthEarningsCount = calendarDays
    .filter(d => d.isCurrentMonth)
    .reduce((sum, d) => sum + d.earnings.length, 0);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calendar View</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Visual overview of your earnings
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{monthName}</h3>
          <button
            onClick={today}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Today
          </button>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Month Total</span>
          </div>
          <p className="text-xl font-bold text-green-900 dark:text-green-100">
            ${monthTotal.toFixed(2)}
          </p>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Transactions</span>
          </div>
          <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
            {monthEarningsCount}
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDay(day)}
              className={`
                relative aspect-square rounded-lg p-2 transition-all hover:scale-105
                ${getIntensityClass(day.totalAmount)}
                ${!day.isCurrentMonth ? 'opacity-40' : ''}
                ${isToday(day.date) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                ${selectedDay?.date.toDateString() === day.date.toDateString() ? 'ring-2 ring-purple-500' : ''}
              `}
            >
              <div className="flex flex-col h-full">
                <span className={`text-xs font-medium ${
                  day.totalAmount > 0
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {day.date.getDate()}
                </span>
                {day.totalAmount > 0 && (
                  <div className="mt-auto">
                    <span className="text-[10px] font-bold text-green-900 dark:text-green-100">
                      ${day.totalAmount.toFixed(0)}
                    </span>
                    {day.earnings.length > 1 && (
                      <div className="text-[9px] text-green-700 dark:text-green-200">
                        {day.earnings.length} items
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && selectedDay.earnings.length > 0 && (
        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              {selectedDay.date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h4>
            <span className="text-lg font-bold text-purple-900 dark:text-purple-100">
              ${selectedDay.totalAmount.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            {selectedDay.earnings.map((earning: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {earning.description || 'Earning'}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${earning.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span>Intensity:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"></div>
          <span>$0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30"></div>
          <span>&lt;$50</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-300 dark:bg-green-700/50"></div>
          <span>&lt;$200</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-500 dark:bg-green-600/70"></div>
          <span>&lt;$500</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-700 dark:bg-green-500"></div>
          <span>$500+</span>
        </div>
      </div>
    </div>
  );
}
