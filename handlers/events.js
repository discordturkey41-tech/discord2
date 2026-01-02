const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "../events");

  // دالة recursive تجيب كل ملفات .js من المجلدات الفرعية
  function getAllEventFiles(dirPath) {
    let results = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        results = results.concat(getAllEventFiles(filePath));
      } else if (file.endsWith(".js")) {
        results.push(filePath);
      }
    }

    return results;
  }

  const eventFiles = getAllEventFiles(eventsPath);

  for (const file of eventFiles) {
    const event = require(file);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }

    console.log(`[EVENT LOADED] ${event.name}`);
  }
};
