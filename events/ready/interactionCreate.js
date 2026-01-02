const client = require("../../index");

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(client, interaction) {

        // 📌 التعامل مع الـ Autocomplete
        if (interaction.isAutocomplete()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (command && typeof command.autocomplete === "function") {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error(`${interaction.commandName} Autocomplete Error:`, error);
                }
            }
            return; // نوقف هنا عشان ما يدخل على أوامر السلاش العادية
        }

        // 📌 أوامر السلاش العادية
        if (!interaction.isCommand()) return;
        if (!interaction.channel.guild) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(client, interaction);
        } catch (error) {
            console.error(`${interaction.commandName} Error`, error);

            await interaction.reply({
                content: `**حــدث خــطــأ، الرجــاء الــتــواصــل مــع الدعــم لــحــل الــمــشــكــلــة**\n[رابــط الدعــم](https://discord.gg/DDEMEczWAx)\n**الــمــشــكــلــة:** ${error.message}`,
                ephemeral: true
            });
        }
    }
};
