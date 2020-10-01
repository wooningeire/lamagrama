const Discord = require("../node_modules/discord.js");
const client = new Discord.Client();
const guilds = {};

client.on("ready", () => {
    guilds.nos = client.guilds.get("206578057463463938");
});

module.exports = { Discord, client, guilds };