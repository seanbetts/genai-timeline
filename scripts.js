// All timeline content is served in HTML; search retains the original behavior.
document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('search-bar');
    const sections = [...document.querySelectorAll('#timeline .year')];
    const cards = [...document.querySelectorAll('#timeline .event')];
    const empty = document.getElementById('no-results');
    const entries = cards.map(card => ({
        card,
        headline: card.querySelector('p').textContent.toLowerCase(),
        date: card.querySelector('time').textContent.toLowerCase()
    }));

    function filter() {
        const term = search.value.toLowerCase();
        let count = 0;
        entries.forEach(({card, headline, date}) => {
            card.hidden = !(headline.includes(term) || date.includes(term));
            if (card.hidden) return;
            const left = count % 2 === 0;
            card.classList.toggle('left', left);
            card.classList.toggle('right', !left);
            const circle = card.querySelector('.circle');
            circle.classList.toggle('circle-left', left);
            circle.classList.toggle('circle-right', !left);
            count++;
        });
        sections.forEach(section => {
            section.hidden = !section.querySelector('.event:not([hidden])');
        });
        empty.hidden = count !== 0;
    }

    search.addEventListener('input', filter);
    filter();
});
