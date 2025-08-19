import { HttpParams } from '@angular/common/http';

export function titleCase(str: string | undefined): string {
    if (str === undefined || !str) {
        return ''
    }
    
    var result: string[] = [];
    const alwaysUpperCase = ['TMC', 'IT']; // List of words to always keep in uppercase
    const specialCases = {
        'SALESMAN-TMC': 'Salesman-TMC'
    };
    for (var word of str.split(' ')) {
        if (alwaysUpperCase.includes(word.toUpperCase())) {
            // Special case for these words to keep it in uppercase
            result.push(word.toUpperCase());
        } else if (word.toUpperCase() in specialCases) {
            result.push(specialCases[word.toUpperCase() as keyof typeof specialCases]);
        } else {
            // Capitalize the first letter of each word
            result.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        }
    }
    return result.join(' ');
}

export function formatDate(dateInput: Date | string | null | undefined): string | null {
    // Handle null/undefined cases
    if (!dateInput) return null;
    
    let date: Date;
    
    // If already a Date object, use it directly
    if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        // Try to parse the string input
        try {
            date = new Date(dateInput);
        } catch (error) {
            console.warn('[formatDate] Error parsing date:', dateInput, error);
            return dateInput; // Return original string if error occurs
        }
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        console.warn('[formatDate] Invalid date received:', dateInput);
        return typeof dateInput === 'string' ? dateInput : null; // Return original string or null
    }
    
    // Format the valid date
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function parseAdaptorSN(equipments: string): string | null {
    // Regular expression to match the serial number in the format "(s/n: SERIAL_NUMBER)"
    const regex = /\(s\/n: (\w+)\)/g;
    const match = regex.exec(equipments);

    // If a match is found, return the serial number; otherwise, return null
    return match? match[1] : null;
}

export function formatRupiah(amount: number): string {
    return Intl.NumberFormat('id-ID', {
        style: "currency",
        currency: "IDR"
    }).format(amount);
}

// Generic normalizer for optional numeric fields that should become null when empty / zero / invalid
export function normalizeOptionalNumber<T = any>(value: T): number | null {
    if (value === null || value === undefined) return null;
    // Treat empty string & pure whitespace as null
    if (typeof value === 'string') {
        if (value.trim() === '' || value === '0') return null;
    }
    // Treat 0 explicitly as null when semantic indicates 'unset'
    if (value === 0) return null;
    const n = Number(value as any);
    if (isNaN(n)) return null;
    return n;
}

// Convenience alias specifically for cost center semantics (VACANT / unset -> null)
export const normalizeCostCenter = normalizeOptionalNumber;

/**
 * Generic utility to build HttpParams from an object, filtering out null/undefined/empty/zero values
 * @param filter - Object with key-value pairs to convert to query parameters
 * @param excludeZero - Whether to exclude zero values (default: true for backward compatibility)
 * @returns HttpParams object ready for use in HTTP requests
 */
export function buildHttpParams(filter: Record<string, any>, excludeZero: boolean = true): HttpParams {
  let params = new HttpParams();
  
  // Add non-null/non-empty parameters to the query string
  Object.keys(filter).forEach(key => {
    const value = filter[key];
    
    // Skip null, undefined, or empty string values
    if (value === null || value === undefined || value === '') {
      return;
    }
    
    // Skip zero values if excludeZero is true
    if (excludeZero && value === 0) {
      return;
    }
    
    // Add valid parameter
    params = params.set(key, value.toString());
  });
  
  return params;
}