// Check proposed data with the shared publication parser, without network requests.
import fs from 'node:fs';
import vm from 'node:vm';

try {
  const source = fs.readFileSync(process.argv[2], 'utf8');
  const start = source.indexOf('function parseCSVRow(row)');
  const end = source.length;
  if (start < 0 || end <= start) {
    throw new Error('Cannot locate the publication CSV parser; update this checker if csv-parser.js changes.');
  }
  const errors = [];
  const context = vm.createContext({ console: { error: value => errors.push(String(value)) } });
  vm.runInContext(source.slice(start, end), context, { timeout: 1000 });
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  context.csv = input.csv;
  const parsed = vm.runInContext(
    'csv.split("\\n").slice(1).filter(row => row.trim()).map(parseCSVRow)',
    context, { timeout: 5000 });
  if (errors.length || parsed.length !== input.rows.length) {
    throw new Error(`Site parser rejected data: ${errors.join('; ')}`);
  }
  parsed.forEach((event, i) => {
    const [date, headline, link] = input.rows[i];
    const [day, month, year] = date.split('/').map(Number);
    // Historical CSV has an unbalanced URL quote that the site strips. Reported by Python.
    const links = [link.trim(), link.replaceAll('"', '').trim()];
    if (!event || event.headline !== headline.trim() || !links.includes(event.link) ||
        event.date.getFullYear() !== year || event.date.getMonth() + 1 !== month ||
        event.date.getDate() !== day) {
      throw new Error(`Site parser disagrees with CSV record ${i + 2}.`);
    }
  });
  process.stdout.write(process.argv.includes('--json') ? JSON.stringify(parsed.map(event => ({headline: event.headline, link: event.link}))) : `Publication parser accepted ${parsed.length} events.\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
