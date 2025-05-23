document.addEventListener('DOMContentLoaded', function () {
    const csvUrl = 'https://raw.githubusercontent.com/seanbetts/genai-timeline/main/timeline.csv';
    const timeline = document.getElementById('timeline');
    const searchBar = document.getElementById('search-bar');
    let events = [];

    function createNoResultsMessage() {
        const noResultsMessage = document.createElement('p');
        noResultsMessage.id = 'no-results';
        noResultsMessage.textContent = 'No Events Found';
        noResultsMessage.style.display = 'none';
        noResultsMessage.classList.add('no-results');
        timeline.parentNode.insertBefore(noResultsMessage, timeline);
        return noResultsMessage;
    }

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

    function createEventElement(event, index) {
        const formattedDate = event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const positionClass = index % 2 === 0 ? 'left' : 'right';
        const circleClass = index % 2 === 0 ? 'circle-left' : 'circle-right';
        const eventElement = document.createElement('div');
        eventElement.className = `event ${positionClass}`;
        eventElement.innerHTML = `
            <div class="circle-container"><div class="circle ${circleClass}"></div></div>
            <span class="date">${formattedDate}</span>
            <p>${event.headline}</p>
            <a href="${event.link}" target="_blank">READ MORE</a>
        `;
        return eventElement;
    }

    function renderEvents(filteredEvents = events) {
        timeline.innerHTML = '';
        const noResultsMessage = document.getElementById('no-results') || createNoResultsMessage();

        if (filteredEvents.length === 0) {
            noResultsMessage.style.display = 'block';
            return;
        }

        noResultsMessage.style.display = 'none';
        let currentYear = '';

        filteredEvents.forEach((event, index) => {
            if (currentYear !== event.year) {
                currentYear = event.year;
                const yearSection = document.createElement('section');
                yearSection.id = event.year;
                yearSection.className = 'year';
                yearSection.innerHTML = `<h2>${event.year}</h2><div class="timeline"></div>`;
                timeline.appendChild(yearSection);
            }
            const yearTimeline = document.getElementById(event.year).querySelector('.timeline');
            const eventElement = createEventElement(event, index);
            yearTimeline.appendChild(eventElement);
        });
    }

    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredEvents = events.filter(event =>
            event.headline.toLowerCase().includes(searchTerm) ||
            event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase().includes(searchTerm)
        );
        renderEvents(filteredEvents);
    }

    fetch(csvUrl)
        .then(response => response.text())
        .then(csvText => {
            events = csvText.split('\n').slice(1)
                .map(parseCSVRow)
                .filter(Boolean)
                // .sort((a, b) => a.date - b.date);  // Sort from earliest to latest
                .sort((a, b) => b.date - a.date);  // Sort from latest to earliest
            renderEvents();
            searchBar.addEventListener('input', handleSearch);
        })
        .catch(error => console.error('Error fetching data:', error));
});