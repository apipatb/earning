import { useEffect, useState } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/currency';
import { useCurrencyStore } from '../../store/currency.store';

interface DayData {
  date: string;
  amount: number;
  count: number;
  level: number; // 0-4 intensity level
}

export default function EarningsHeatmap() {
  const [heatmapData, setHeatmapData] = useState<DayData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { currency } = useCurrencyStore();

  useEffect(() => {
    generateHeatmapData();
  }, [selectedMonth, selectedYear]);

  const generateHeatmapData = () => {
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const data: DayData[] = [];

    // Initialize all days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      data.push({
        date: dateStr,
        amount: 0,
        count: 0,
        level: 0,
      });
    }

    // Aggregate earnings by date
    earnings.forEach((earning: any) => {
      const earningDate = earning.date.split('T')[0]; // Get YYYY-MM-DD
      const dayData = data.find(d => d.date === earningDate);
      if (dayData) {
        dayData.amount += earning.amount;
        dayData.count += 1;
      }
    });

    // Calculate intensity levels
    const maxAmount = Math.max(...data.map(d => d.amount), 1);
    data.forEach(day => {
      if (day.amount === 0) {
        day.level = 0;
      } else if (day.amount <= maxAmount * 0.25) {
        day.level = 1;
      } else if (day.amount <= maxAmount * 0.5) {
        day.level = 2;
      } else if (day.amount <= maxAmount * 0.75) {
        day.level = 3;
      } else {
        day.level = 4;
      }
    });

    setHeatmapData(data);
  };

  const getLevelColor = (level: number): string => {
    const colors = {
      0: 'bg-gray-100 dark:bg-gray-700',
      1: 'bg-green-200 dark:bg-green-900',
      2: 'bg-green-400 dark:bg-green-700',
      3: 'bg-green-600 dark:bg-green-500',
      4: 'bg-green-800 dark:bg-green-400',
    };
    return colors[level as keyof typeof colors] || colors[0];
  };

  const getWeeksInMonth = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Math.ceil((firstDay + daysInMonth) / 7);
  };

  const getDayOfWeek = (day: number) => {
    return new Date(selectedYear, selectedMonth, day).getDay();
  };

  const getTotalEarnings = () => heatmapData.reduce((sum, d) => sum + d.amount, 0);
  const getActiveDays = () => heatmapData.filter(d => d.amount > 0).length;
  const getAvgPerDay = () => {
    const active = getActiveDays();
    return active > 0 ? getTotalEarnings() / active : 0;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Earnings Heatmap
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {months.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="mb-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((day, idx) => (
            <div key={idx} className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: getDayOfWeek(1) }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}

          {/* Days of month */}
          {heatmapData.map((day, idx) => {
            const dayNum = new Date(day.date).getDate();
            return (
              <div
                key={day.date}
                className={`aspect-square rounded-sm ${getLevelColor(day.level)} flex items-center justify-center text-xs font-medium cursor-pointer hover:ring-2 hover:ring-blue-500 dark:hover:ring-blue-400 transition-all group relative`}
                title={`${day.date}: ${formatCurrency(day.amount, currency)} (${day.count} transactions)`}
              >
                <span className="text-gray-700 dark:text-gray-300">{dayNum}</span>

                {/* Tooltip */}
                {day.amount > 0 && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
                      <div className="font-semibold">{formatCurrency(day.amount, currency)}</div>
                      <div className="text-gray-300 dark:text-gray-400">{day.count} transactions</div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className={`w-4 h-4 rounded-sm ${getLevelColor(level)}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(getTotalEarnings(), currency)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Days</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {getActiveDays()} / {heatmapData.length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg/Day</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(getAvgPerDay(), currency)}
          </div>
        </div>
      </div>
    </div>
  );
}
