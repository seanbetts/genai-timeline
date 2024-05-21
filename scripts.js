document.addEventListener('DOMContentLoaded', function () {
    const csvUrl = 'timeline.csv'; // Update to your local CSV path or appropriate URL
    fetch(csvUrl)
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.split('\n').slice(1); // Split by newline and skip the header row
            const timeline = document.getElementById('timeline');

            const events = rows.map((row, index) => {
                let [date, headline, link] = row.split(',').map(item => item.trim());

                // Remove surrounding double quotes if present
                date = date.replace(/^"|"$/g, '');
                headline = headline.replace(/^"|"$/g, '');
                link = link.replace(/^"|"$/g, '');

                const [day, month, year] = date.split('/').map(Number);
                
                // Logging the date parts for verification
                // console.log(`Parsed date: Day=${day}, Month=${month}, Year=${year}`);
                
                if (isNaN(day) || isNaN(month) || isNaN(year)) {
                    console.error(`Invalid date: ${date}`);
                    return null;
                }

                const eventDate = new Date(year, month - 1, day);
                const formattedDate = eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                const eventElement = document.createElement('div');
                eventElement.className = `event ${index % 2 === 0 ? 'right' : 'left'}`;
                eventElement.innerHTML = `
                    <span class="date">${formattedDate}</span>
                    <p>${headline}</p>
                    <a href="${link}" target="_blank">READ MORE</a>
                `;
                return { year, eventElement };
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

                timeline.innerHTML = '<div class="timeline"></div>';
                filteredEvents.forEach((event, index) => {
                    const eventElementClone = event.eventElement.cloneNode(true);
                    eventElementClone.classList.toggle('right', index % 2 === 0);
                    eventElementClone.classList.toggle('left', index % 2 !== 0);
                    timeline.querySelector('.timeline').appendChild(eventElementClone);
                });

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
                        eventElementClone.classList.toggle('right', index % 2 === 0);
                        eventElementClone.classList.toggle('left', index % 2 !== 0);
                        yearSection.appendChild(eventElementClone);
                    });
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});