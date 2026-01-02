// events/messageCreate.js

module.exports = {

    name: "messageCreate",

    once: false,

    async execute(client, message) {

        if (message.author.bot || !message.guild) return;

        const prefix = "-";

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g);

        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);

        if (!command) return;

        try {

            await command.execute( message, args);

        } catch (err) {

            console.error(err);

        }

    }

};

