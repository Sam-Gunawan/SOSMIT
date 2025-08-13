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