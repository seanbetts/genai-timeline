document.addEventListener('DOMContentLoaded', function () {
    const csvUrl = 'https://raw.githubusercontent.com/seanbetts/genai-timeline/main/timeline.csv';
    const timeline = document.getElementById('timeline');
    const searchInput = document.getElementById('search-bar');
    let currentYear = '';
    const events = [];

    fetch(csvUrl)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(csvText => {
            const rows = csvText.split('\n').slice(1);
            rows.forEach((row, index) => {
                const event = parseRow(row);
                if (event) {
                    events.push(event);
                    if (currentYear !== event.year) {
                        currentYear = event.year;
                        createYearSection(currentYear);
                    }
                    appendEvent(event, index % 2 === 0 ? 'left' : 'right');
                }
            });
        })
        .catch(error => console.error('Error fetching CSV:', error));

    searchInput.addEventListener('input', function() {
        const query = searchInput.value.toLowerCase();
        const filteredEvents = events.filter(event =>
            event.headline.toLowerCase().includes(query) ||
            event.date.toDateString().toLowerCase().includes(query)
        );
        displayFilteredEvents(filteredEvents);
    });

    function parseRow(row) {
        let columns = row.split(',');
        columns = columns.map(col => col.replace(/(^"|"$|\r)/g, '').trim());
        if (columns.length < 3) return null;

        const [date, headline, link] = columns;
        const [day, month, year] = date.split('/');
        const parsedDate = new Date(`${year}-${month}-${day}`);
        if (isNaN(parsedDate)) return null;

        return {
            date: parsedDate,
            year: parsedDate.getFullYear(),
            headline: headline.trim(),
            link: link.trim()
        };
    }

    function createYearSection(year) {
        const yearSection = document.createElement('div');
        yearSection.className = 'year-section';
        yearSection.innerHTML = `<h2>${year}</h2>`;
        timeline.appendChild(yearSection);
    }

    function appendEvent(event, side) {
        const eventElement = document.createElement('div');
        eventElement.className = `event ${side}`;
        eventElement.innerHTML = `
            <div class="date">${event.date.toDateString()}</div>
            <div class="headline"><a href="${event.link}" target="_blank">${event.headline}</a></div>
        `;
        timeline.appendChild(eventElement);
    }

    function displayFilteredEvents(filteredEvents) {
        timeline.innerHTML = '';
        let currentYear = '';
        filteredEvents.forEach((event, index) => {
            if (currentYear !== event.year) {
                currentYear = event.year;
                createYearSection(currentYear);
            }
            appendEvent(event, index % 2 === 0 ? 'left' : 'right');
        });
    }
});
