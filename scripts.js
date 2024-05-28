document.addEventListener('DOMContentLoaded', function () {
    const csvUrl = 'https://raw.githubusercontent.com/seanbetts/genai-timeline/main/timeline.csv';
    fetch(csvUrl)
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.split('\n').slice(1); // Split by newline and skip the header row
            const timeline = document.getElementById('timeline');
            const noResultsMessage = document.createElement('p');
            noResultsMessage.id = 'no-results';
            noResultsMessage.textContent = 'No Events Found';
            noResultsMessage.style.display = 'none';
            noResultsMessage.classList.add('no-results');
            timeline.parentNode.insertBefore(noResultsMessage, timeline);

            const events = rows.map((row, index) => {
                let [date, headline, link] = row.split(',').map(item => item.trim());

                // Remove surrounding double quotes if present
                date = date.replace(/^"|"$/g, '');
                headline = headline.replace(/^"|"$/g, '');
                link = link.replace(/^"|"$/g, '');

                const [day, month, year] = date.split('/').map(Number);

                if (isNaN(day) || isNaN(month) || isNaN(year)) {
                    console.error(`Invalid date: ${date}`);
                    return null;
                }

                const eventDate = new Date(year, month - 1, day);
                const formattedDate = eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                const positionClass = index % 2 === 0 ? 'right' : 'left';
                const circleClass = index % 2 === 0 ? 'circle-right' : 'circle-left';
                const eventElement = document.createElement('div');
                eventElement.className = `event ${positionClass}`;
                eventElement.innerHTML = `
                    <div class="circle-container"><div class="circle ${circleClass}"></div></div>
                    <span class="date">${formattedDate}</span>
                    <p>${headline}</p>
                    <a href="${link}" target="_blank">READ MORE</a>
                `;
                return { year, eventElement, positionClass, circleClass };
            }).filter(Boolean);

            let currentYear = '';
            events.forEach(event => {
                if (currentYear !== event.year) {
                    currentYear = event.year;
                    const yearSection = document.createElement('section');
                    yearSection.id = event.year;
                    yearSection.className = 'year';
                    yearSection.innerHTML = `<h2>${event.year}</h2><div class="timeline"></div>`;
                    timeline.appendChild(yearSection);
                }
                document.getElementById(event.year).querySelector('.timeline').appendChild(event.eventElement);
            });

            document.getElementById('search-bar').addEventListener('input', function (e) {
                const searchTerm = e.target.value.toLowerCase();
                const filteredEvents = events.filter(event =>
                    event.eventElement.querySelector('p').textContent.toLowerCase().includes(searchTerm) ||
                    event.eventElement.querySelector('.date').textContent.toLowerCase().includes(searchTerm)
                );

                timeline.innerHTML = '';

                if (filteredEvents.length === 0) {
                    noResultsMessage.style.display = 'block';
                } else {
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
                        const yearSection = document.getElementById(event.year).querySelector('.timeline');
                        const eventElementClone = event.eventElement.cloneNode(true);
                        eventElementClone.className = `event ${index % 2 === 0 ? 'right' : 'left'}`;
                        const circleContainer = eventElementClone.querySelector('.circle-container');
                        const circle = circleContainer.querySelector('.circle');
                        circle.className = `circle ${index % 2 === 0 ? 'circle-right' : 'circle-left'}`;
                        yearSection.appendChild(eventElementClone);
                    });
                }

                if (!searchTerm) {
                    timeline.innerHTML = '';
                    let currentYear = '';
                    events.forEach((event, index) => {
                        if (currentYear !== event.year) {
                            currentYear = event.year;
                            const yearSection = document.createElement('section');
                            yearSection.id = event.year;
                            yearSection.className = 'year';
                            yearSection.innerHTML = `<h2>${event.year}</h2><div class="timeline"></div>`;
                            timeline.appendChild(yearSection);
                        }
                        const yearSection = document.getElementById(event.year).querySelector('.timeline');
                        const eventElementClone = event.eventElement.cloneNode(true);
                        eventElementClone.className = `event ${index % 2 === 0 ? 'right' : 'left'}`;
                        const circleContainer = eventElementClone.querySelector('.circle-container');
                        const circle = circleContainer.querySelector('.circle');
                        circle.className = `circle ${index % 2 === 0 ? 'circle-right' : 'circle-left'}`;
                        yearSection.appendChild(eventElementClone);
                    });
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});