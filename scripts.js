document.addEventListener('DOMContentLoaded', function () {
    const csvUrl = 'https://raw.githubusercontent.com/your-username/your-repo-name/main/data.csv'; // Replace with the actual URL to your CSV file on GitHub

    fetch(csvUrl)
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.split('\n').slice(1); // Split by newline and skip the header row
            const timeline = document.getElementById('timeline');
            const navList = document.getElementById('nav-list');

            let currentYear = '';

            rows.forEach(row => {
                const [date, headline, link] = row.split(',').map(item => item.trim());
                const eventDate = new Date(date);
                const year = eventDate.getFullYear();
                const month = eventDate.toLocaleString('default', { month: 'long' });
                const day = eventDate.getDate();

                if (currentYear !== year) {
                    currentYear = year;
                    const yearSection = document.createElement('section');
                    yearSection.id = year;
                    yearSection.classList.add('year');
                    yearSection.innerHTML = `<h2>${year}</h2><div class="timeline"></div>`;
                    timeline.appendChild(yearSection);

                    const navItem = document.createElement('li');
                    navItem.innerHTML = `<a href="#${year}">${year}</a>`;
                    navList.appendChild(navItem);
                }

                const yearSection = document.getElementById(year).querySelector('.timeline');
                const event = document.createElement('div');
                event.classList.add('event');
                event.innerHTML = `
                    <span class="date">${month} ${day}, ${year}</span>
                    <p>${headline}</p>
                    <a href="${link}" target="_blank">Read more</a>
                `;
                yearSection.appendChild(event);
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});