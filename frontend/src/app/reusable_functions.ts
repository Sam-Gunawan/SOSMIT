export function titleCase(str: string): string {
    var result: string[] = [];
    for (var word of str.split(' ')) {
        if (word.toUpperCase() === 'TMC') {
            // Special case for "TMC" to keep it in uppercase
            result.push('TMC');
        } else if (word.toUpperCase() === 'SALESMAN-TMC') {
            result.push('Salesman-TMC');
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