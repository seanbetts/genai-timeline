// CSV compatibility parser shared by publication and data validation.
    function parseCSVRow(row) {
        const fields = [];
        let currentField = '';
        let insideQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
                if (insideQuotes && row[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                fields.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }

        fields.push(currentField.trim());

        if (fields.length !== 3) {
            console.error(`Invalid row: ${row}`);
            return null;
        }

        const [date, headline, link] = fields;
        const [day, month, year] = date.split('/').map(Number);

        if (isNaN(day) || isNaN(month) || isNaN(year)) {
            console.error(`Invalid date: ${date}`);
            return null;
        }

        const eventDate = new Date(year, month - 1, day);
        return { date: eventDate, headline, link, year };
    }
