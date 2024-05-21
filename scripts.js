document.addEventListener('DOMContentLoaded', function () {
    const csvUrl = 'https://raw.githubusercontent.com/seanbetts/genai-timeline/main/timeline.csv';
    fetch(csvUrl)
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.split('\n').slice(1); // Split by newline and skip the header row
            const timeline = document.getElementById('timeline');

            let currentYear = '';
            let eventIndex = 0; // To keep track of event order

            const events = []; // Store events for search functionality

            rows.forEach(row => {
                // Split row into date, headline, and link by matching the first and last comma
                const regex = /([^,]+),(.+),([^,]+)$/;
                const match = row.match(regex);
                if (match) {
                    const date = match[1].trim();
                    let headline = match[2].trim();
                    const link = match[3].trim();

                    // Remove surrounding quotation marks if present
                    if (headline.startsWith('"') && headline.endsWith('"')) {
                        headline = headline.slice(1, -1);
                    }

                    // Parse the date in UK format
                    const [day, month, year] = date.split('/').map(num => parseInt(num, 10));
                    const eventDate = new Date(year, month - 1, day); // JavaScript months are 0-based
                    const formattedYear = eventDate.getFullYear();
                    const formattedMonth = eventDate.toLocaleString('default', { month: 'long' });
                    const formattedDay = eventDate.getDate();

                    const event = {
                        date: `${formattedDay}/${formattedMonth}/${formattedYear}`,
                        headline: headline,
                        link: link,
                        year: formattedYear,
                        month: formattedMonth,
                        day: formattedDay,
                        eventIndex: eventIndex,
                        element: null // Will hold the DOM element for easy manipulation
                    };
                    events.push(event);

                    if (currentYear !== formattedYear) {
                        currentYear = formattedYear;
                        const yearSection = document.createElement('section');
                        yearSection.id = formattedYear;
                        yearSection.classList.add('year');
                        yearSection.innerHTML = `<h2>${formattedYear}</h2><div class="timeline"></div>`;
                        timeline.appendChild(yearSection);
                    }

                    const yearSection = document.getElementById(formattedYear).querySelector('.timeline');
                    const eventElement = document.createElement('div');
                    eventElement.classList.add('event');
                    eventElement.classList.add(eventIndex % 2 === 0 ? 'right' : 'left'); // Alternate classes
                    eventElement.innerHTML = `
                        <span class="date">${formattedMonth} ${formattedDay}, ${formattedYear}</span>
                        <p>${headline}</p>
                        <a href="${link}" target="_blank">READ MORE</a>
                    `;
                    yearSection.appendChild(eventElement);

                    event.element = eventElement; // Store the DOM element in the event object
                    eventIndex++;
                }
            });

            // Add event listener for the search bar
            document.getElementById('search-bar').addEventListener('input', function (e) {
                const searchTerm = e.target.value.toLowerCase();
                let filteredEventIndex = 0; // To keep track of filtered event order

                // Clear the current timeline, but keep the structure for the timeline line
                timeline.innerHTML = '<div class="timeline"></div>';
                const filteredTimeline = timeline.querySelector('.timeline');

                events.forEach(event => {
                    const matches = event.headline.toLowerCase().includes(searchTerm) ||
                                    event.date.toLowerCase().includes(searchTerm);
                    if (matches) {
                        // Clone the event element and update its class for alternating positions
                        const eventElementClone = event.element.cloneNode(true);
                        eventElementClone.classList.remove('left', 'right');
                        eventElementClone.classList.add(filteredEventIndex % 2 === 0 ? 'right' : 'left');
                        filteredTimeline.appendChild(eventElementClone);
                        filteredEventIndex++;
                    }
                });

                // If there's no search term, recreate the original timeline structure
                if (!searchTerm) {
                    timeline.innerHTML = '';
                    let currentYear = '';
                    events.forEach((event, index) => {
                        if (currentYear !== event.year) {
                            currentYear = event.year;
                            const yearSection = document.createElement('section');
                            yearSection.id = event.year;
                            yearSection.classList.add('year');
                            yearSection.innerHTML = `<h2>${event.year}</h2><div class="timeline"></div>`;
                            timeline.appendChild(yearSection);
                        }

                        const yearSection = document.getElementById(event.year).querySelector('.timeline');
                        const eventElementClone = event.element.cloneNode(true);
                        eventElementClone.classList.remove('left', 'right');
                        eventElementClone.classList.add(index % 2 === 0 ? 'right' : 'left');
                        yearSection.appendChild(eventElementClone);
                    });
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});