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

export function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    };

    return new Intl.DateTimeFormat('en-US', options).format(date);
}