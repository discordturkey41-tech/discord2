const fs = require('fs');
const path = require('path');
const ascii = require('ascii-table');

module.exports = (client) => {
    const functionsPath = path.resolve(__dirname, '../functions');

    if (!fs.existsSync(functionsPath)) {
        console.warn(`⚠️ Functions folder not found: ${functionsPath}`);
        return;
    }

    let table = new ascii('Functions');
    table.setHeading('Function', 'Status');

    const functionFiles = fs.readdirSync(functionsPath).filter(file => file.endsWith('.js'));

    for (const file of functionFiles) {
        try {
            const funcPath = path.join(functionsPath, file);
            const func = require(funcPath);

            if (typeof func === 'function') {
                func(client);
                table.addRow(file, '✅');
            } else {
                table.addRow(file, '❌');
            }
        } catch (err) {
            table.addRow(file, '❌');
            console.error(`❌ Error loading function ${file}:`, err);
        }
    }

    console.log(table.toString());
    console.log(`✅ Finished loading functions from: ${functionsPath}`);
};
