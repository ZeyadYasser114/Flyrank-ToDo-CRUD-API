const fs = require('fs');

async function main() {
    const cases = JSON.parse(fs.readFileSync('./evals/cases.json', 'utf-8'));
    let passed = 0;
    const failures = [];

    for (const c of cases) {
        const res = await fetch('http://localhost:3000/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: c.text })
        });
        const data = await res.json();
        const match = data.category === c.expected_category;
        if (match) {
            passed++;
        } else {
            failures.push({ text: c.text, expected: c.expected_category, got: data.category || data.error });
        }
    }

    console.log(`Score: ${passed}/${cases.length}`);
    if (failures.length > 0) {
        console.log('Failures:');
        failures.forEach(f => console.log(`  "${f.text}" — expected ${f.expected}, got ${f.got}`));
    }
}

main();