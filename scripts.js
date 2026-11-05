// Progressive enhancement: all milestones and sources are already in the HTML.
document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('search-bar');
    const sections = [...document.querySelectorAll('#timeline .year')];
    const cards = [...document.querySelectorAll('#timeline .event')];
    const status = document.getElementById('search-status');
    const empty = document.getElementById('no-results');
    const navigation = [...document.querySelectorAll('.year-navigation a')];
    const entries = cards.map(card => ({
        card,
        text: `${card.querySelector('h3').textContent} ${card.querySelector('time').textContent}`.toLocaleLowerCase('en-GB')
    }));

    function filter() {
        const term = search.value.trim().toLocaleLowerCase('en-GB');
        let count = 0;
        entries.forEach(({card, text}) => {
            card.hidden = !text.includes(term);
            if (!card.hidden) count++;
        });
        sections.forEach(section => {
            section.hidden = !section.querySelector('.event:not([hidden])');
        });
        navigation.forEach(link => {
            link.hidden = document.getElementById(link.hash.slice(1)).hidden;
        });
        empty.hidden = count !== 0;
        status.hidden = !term;
        status.textContent = term ? `${count} ${count === 1 ? 'milestone' : 'milestones'} found` : '';
    }

    function revealHash() {
        const target = document.getElementById(location.hash.slice(1));
        if (!target || !target.closest('#timeline')) return;
        search.value = '';
        filter();
        target.scrollIntoView();
    }

    document.getElementById('search-controls').hidden = false;
    search.addEventListener('input', filter);
    window.addEventListener('hashchange', revealHash);
    // Clicking the same fragment again does not trigger hashchange.
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (link && link.hash === location.hash) revealHash();
    });
    filter();
    revealHash();
});
