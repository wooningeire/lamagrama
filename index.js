// polyfill
if (![].flat) {
    Array.prototype.flat = function (depth=1) {
        let result = this.slice();

        if (depth > 1) result = result.flat(--depth);

        return [].concat(...result);
    };
}
if (![].flatMap) {
    Array.prototype.flatMap = function (callback, thisArg) {
        return this.map(callback, thisArg).flat();
    };
}

const { client } = require("./client.js");
const { token } = require("./config.js");

const Command = require("./command/Command");
const { util, sendToAuthorOf, log } = require("./util/util");

require("./cog/gatelog.js");

client.on("ready", async () => {
    log("BOT", "Discord bot connected to server!", "gray");
    
    util.self = client.users.get("237686900507279362");

    await client.user.setPresence({
        game: {
            type: 3,
            name: `you type "${Command.cmdsCommand}"`,
        },
    });
});

const Color = require("./Color");
Color.defineNames(
    ["discord.blurple", "7289da"],
    ["discord.full_white", "ffffff"],
    ["discord.greyple", "99aab5"],
    ["discord.dark_but_not_black", "2c2f33"],
    ["discord.not_quite_black", "23272a"],
);

client.on("message", message => {
    // Don't respond to self
    if (message.author.id === "237686900507279362") return;
    if (message.author.bot) return;

    if (!message.content.startsWith(Command.prefix)) return;

    const commandName = Command.searchName(message.content);
    const command = Command.get(commandName);

    if (command) {
        command.parseInvocationAndCall(message);
    } else {
        sendToAuthorOf(message, `No such command exists. To get a list of commands, try \`${Command.cmdsCommand}\`.`);
    }
});

client.on("error", error => {
    log("BOT", error.error.code, "red");
    return;
    // console.log(error);
});

process.on("uncaughtException", error => {
    console.log(error);
});

client.login(token);