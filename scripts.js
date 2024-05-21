document.addEventListener('DOMContentLoaded', function () {
    const csvUrl = 'https://raw.githubusercontent.com/seanbetts/genai-timeline/main/timeline.csv';
    const timeline = document.getElementById('timeline');
    let currentYear = '';
    let eventIndex = 0;
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
                    appendEvent(event);
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));

    function parseRow(row) {
        const regex = /([^,]+),(.+),([^,]+)$/;
        const match = row.match(regex);
        if (!match) return null;

        const date = match[1].trim();
        let headline = match[2].trim();
        const link = match[3].trim();

        if (headline.startsWith('"') && headline.endsWith('"')) {
            headline = headline.slice(1, -1);
        }

        const [day, month, year] = date.split('/').map(num => parseInt(num, 10));
        const eventDate = new Date(year, month - 1, day);
        const formattedYear = eventDate.getFullYear();
        const formattedMonth = eventDate.toLocaleString('default', { month: 'long' });
        const formattedDay = eventDate.getDate();

        return {
            date: `${formattedDay}/${formattedMonth}/${formattedYear}`,
            headline: headline,
            link: link,
            year: formattedYear,
            month: formattedMonth,
            day: formattedDay,
            eventIndex: eventIndex++,
            element: createEventElement(formattedMonth, formattedDay, formattedYear, headline, link)
        };
    }

    function createYearSection(year) {
        const yearSection = document.createElement('section');
        yearSection.id = year;
        yearSection.classList.add('year');
        yearSection.innerHTML = `<h2>${year}</h2><div class="timeline"></div>`;
        timeline.appendChild(yearSection);
    }

    function appendEvent(event) {
        const yearSection = document.getElementById(event.year).querySelector('.timeline');
        yearSection.appendChild(event.element);
    }

    function createEventElement(month, day, year, headline, link) {
        const eventElement = document.createElement('div');
        eventElement.classList.add('event', eventIndex % 2 === 0 ? 'right' : 'left');
        eventElement.innerHTML = `
            <span class="date">${month} ${day}, ${year}</span>
            <p>${headline}</p>
            <a href="${link}" target="_blank">READ MORE</a>
        `;
        return eventElement;
    }

    document.getElementById('search-bar').addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        filterEvents(searchTerm);
    });

    function filterEvents(searchTerm) {
        timeline.innerHTML = '<div class="timeline"></div>';
        const filteredTimeline = timeline.querySelector('.timeline');
        const fragment = document.createDocumentFragment();

        let filteredEventIndex = 0;
        events.forEach(event => {
            const matches = event.headline.toLowerCase().includes(searchTerm) || event.date.toLowerCase().includes(searchTerm);
            if (matches) {
                const eventElementClone = event.element.cloneNode(true);
                eventElementClone.classList.remove('left', 'right');
                eventElementClone.classList.add(filteredEventIndex % 2 === 0 ? 'right' : 'left');
                fragment.appendChild(eventElementClone);
                filteredEventIndex++;
            }
        });

        filteredTimeline.appendChild(fragment);
        if (!searchTerm) restoreOriginalTimeline();
    }

    function restoreOriginalTimeline() {
        timeline.innerHTML = '';
        let currentYear = '';
        events.forEach((event, index) => {
            if (currentYear !== event.year) {
                currentYear = event.year;
                createYearSection(event.year);
            }
            appendEvent(event);
        });
    }
});