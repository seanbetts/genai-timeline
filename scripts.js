document.addEventListener('DOMContentLoaded', function () {
    const csvUrl = 'https://raw.githubusercontent.com/seanbetts/genai-timeline/main/timeline.csv'; // Replace with the actual URL to your CSV file on GitHub

    fetch(csvUrl)
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.split('\n').slice(1); // Split by newline and skip the header row
            const timeline = document.getElementById('timeline');
            const navList = document.getElementById('nav-list');

            let currentYear = '';
            let eventIndex = 0; // To keep track of event order

            rows.forEach(row => {
                const [date, headline, link] = row.split(',').map(item => item.trim());

                // Parse the date in UK format
                const [day, month, year] = date.split('/').map(num => parseInt(num, 10));
                const eventDate = new Date(year, month - 1, day); // JavaScript months are 0-based
                const formattedYear = eventDate.getFullYear();
                const formattedMonth = eventDate.toLocaleString('default', { month: 'long' });
                const formattedDay = eventDate.getDate();

                if (currentYear !== formattedYear) {
                    currentYear = formattedYear;
                    const yearSection = document.createElement('section');
                    yearSection.id = formattedYear;
                    yearSection.classList.add('year');
                    yearSection.innerHTML = `<h2>${formattedYear}</h2><div class="timeline"></div>`;
                    timeline.appendChild(yearSection);

                    const navItem = document.createElement('li');
                    navItem.innerHTML = `<a href="#${formattedYear}">${formattedYear}</a>`;
                    navList.appendChild(navItem);
                }

                const yearSection = document.getElementById(formattedYear).querySelector('.timeline');
                const event = document.createElement('div');
                event.classList.add('event');
                event.classList.add(eventIndex % 2 === 0 ? 'right' : 'left'); // Alternate classes
                event.innerHTML = `
                    <span class="date">${formattedMonth} ${formattedDay}, ${formattedYear}</span>
                    <p>${headline}</p>
                    <a href="${link}" target="_blank">Read more</a>
                `;
                yearSection.appendChild(event);

                eventIndex++;
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});

// https://raw.githubusercontent.com/seanbetts/genai-timeline/main/timeline.csv