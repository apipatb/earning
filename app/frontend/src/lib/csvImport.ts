export interface CSVEarning {
  platformName: string;
  date: string;
  amount: number;
  hours?: number;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  data?: CSVEarning[];
  errors?: string[];
  warnings?: string[];
}

export const parseCSV = (csvText: string): ImportResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: CSVEarning[] = [];

  try {
    // Split into lines
    const lines = csvText.trim().split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return {
        success: false,
        errors: ['CSV file is empty'],
      };
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Validate required columns
    const requiredColumns = ['platform', 'date', 'amount'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));

    if (missingColumns.length > 0) {
      return {
        success: false,
        errors: [`Missing required columns: ${missingColumns.join(', ')}`],
      };
    }

    // Get column indices
    const platformIndex = header.indexOf('platform');
    const dateIndex = header.indexOf('date');
    const amountIndex = header.indexOf('amount');
    const hoursIndex = header.indexOf('hours');
    const notesIndex = header.indexOf('notes');

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];

      // Handle CSV with quoted fields
      const values = parseCSVLine(line);

      if (values.length < 3) {
        warnings.push(`Line ${lineNumber}: Incomplete data, skipping`);
        continue;
      }

      const platformName = values[platformIndex]?.trim();
      const dateStr = values[dateIndex]?.trim();
      const amountStr = values[amountIndex]?.trim();
      const hoursStr = hoursIndex !== -1 ? values[hoursIndex]?.trim() : undefined;
      const notes = notesIndex !== -1 ? values[notesIndex]?.trim() : undefined;

      // Validate platform
      if (!platformName) {
        errors.push(`Line ${lineNumber}: Platform name is required`);
        continue;
      }

      // Validate date
      if (!dateStr) {
        errors.push(`Line ${lineNumber}: Date is required`);
        continue;
      }

      const date = parseDateString(dateStr);
      if (!date) {
        errors.push(`Line ${lineNumber}: Invalid date format "${dateStr}". Use YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY`);
        continue;
      }

      // Validate amount
      if (!amountStr) {
        errors.push(`Line ${lineNumber}: Amount is required`);
        continue;
      }

      const amount = parseFloat(amountStr.replace(/[,$]/g, ''));
      if (isNaN(amount) || amount < 0) {
        errors.push(`Line ${lineNumber}: Invalid amount "${amountStr}"`);
        continue;
      }

      // Parse hours (optional)
      let hours: number | undefined;
      if (hoursStr) {
        hours = parseFloat(hoursStr);
        if (isNaN(hours) || hours < 0) {
          warnings.push(`Line ${lineNumber}: Invalid hours "${hoursStr}", ignoring`);
          hours = undefined;
        }
      }

      data.push({
        platformName,
        date,
        amount,
        hours,
        notes: notes || undefined,
      });
    }

    if (errors.length > 0) {
      return {
        success: false,
        data,
        errors,
        warnings,
      };
    }

    if (data.length === 0) {
      return {
        success: false,
        errors: ['No valid data found in CSV'],
        warnings,
      };
    }

    return {
      success: true,
      data,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map(v => v.trim().replace(/^"|"$/g, ''));
};

const parseDateString = (dateStr: string): string | null => {
  // Try different date formats
  const formats = [
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ];

  // Try YYYY-MM-DD first
  let match = dateStr.match(formats[0]);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return formatDate(date);
    }
  }

  // Try MM/DD/YYYY
  match = dateStr.match(formats[1]);
  if (match) {
    const [, month, day, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return formatDate(date);
    }
  }

  // Try DD/MM/YYYY (European format)
  match = dateStr.match(formats[2]);
  if (match) {
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date) && parseInt(day) <= 31 && parseInt(month) <= 12) {
      return formatDate(date);
    }
  }

  return null;
};

const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateCSVTemplate = (): string => {
  return `platform,date,amount,hours,notes
Upwork,2024-01-15,500.00,8,Web development project
Fiverr,2024-01-16,250.50,4,Logo design
DoorDash,2024-01-17,125.75,,Food delivery
YouTube,2024-01-18,89.99,,Ad revenue`;
};

export const downloadCSVTemplate = (): void => {
  const template = generateCSVTemplate();
  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'earntrack-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
