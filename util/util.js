const { Discord, guilds, client } = require("../client.js");

const util = {
    async antiping(channel, text, ...users) {
        let text1 = text;
        let text2 = text;

        const percentSRegEx = /(?<=[^\\](?:\\\\)*)%s/g;
        const substsAmount = text.match(percentSRegEx).length;
        for (let i = 0; i < substsAmount; i++) {
            const user = util.resolveUser(users[i]);

            text1 = spliceString(text1, text1.search(percentSRegEx), 2, `@${user.username}`);
            text2 = spliceString(text2, text2.search(percentSRegEx), 2, user.toString());
        }

        const newMessage = await channel.send(text1);
        newMessage.edit(text2);

        return newMessage;

        function spliceString(string, index, deleteCount, newContent) {
            return string.slice(0, index) + newContent + string.slice(index + deleteCount);
        }
    },

    async messageTimeoutDelete(messageOrPromise, timeout=12000, invokerMessage, appendNotice=false) {
        let newMessage;

        if (messageOrPromise instanceof Promise) {
            newMessage = await messageOrPromise;
        } else if (messageOrPromise instanceof Discord.Message) {
            newMessage = messageOrPromise;
        }
        
        if (newMessage.channel instanceof Discord.TextChannel) {
            setTimeout(() => {
                if (!newMessage.deleted) {
                    newMessage.delete();
                }
                if (invokerMessage && !invokerMessage.deleted) {
                    invokerMessage.delete();
                }
            }, timeout);
        }

        if (appendNotice && invokerMessage.channel instanceof Discord.TextChannel) {
            const seconds = parseFloat((timeout / 1000).toFixed(2));
            util.appendToMessage(messageOrPromise, `\t(These messages will be deleted in **${seconds}** second${util.ifPlural(seconds)})`);
        }

        return newMessage;
    },

    appendToMessage(messageOrPromise, appendage="") {
        let appendageText = "";

        if (messageOrPromise instanceof Promise) {
            return messageOrPromise.then(newMessage => {
                if (typeof appendage === "function") {
                    appendageText = appendage(newMessage);
                } else {
                    appendageText = appendage;
                }

                newMessage.edit(newMessage.content + appendageText);
            });
        } else if (messageOrPromise instanceof Discord.Message) {
            if (typeof appendage === "function") {
                appendageText = appendage(messageOrPromise);
            } else {
                appendageText = appendage;
            }

            return messageOrPromise.edit(messageOrPromise.content + appendageText);
        }
    },

    resolveUser(arg) {
        if (arg instanceof Discord.User) {
            return arg;
        } else if (arg instanceof Discord.Message) {
            return arg.author;
        } else if (arg instanceof Discord.GuildMember) { console.log("wow");
            return arg.user;
        }

        const user = util.getGuildUser(arg);
        if (user) return user.user;

        return null;
    },

    resolveTextChannel(arg) {
        if (arg instanceof Discord.TextChannel) {
            return arg;
        } else if (arg instanceof Discord.Message) {
            return arg.channel;
        }

        return null;
    },

    matchesUser(identifier, user) {
        const regex = new RegExp(
            "^(" +
            `${user.id}|` +
            `@?${user.username}(#\d{4})?|` +
            `<(@!?)?${user.id}>` +
            ")$"
        );
        return Boolean(identifier.match(regex));
    },

    getGuildUser(identifier="", guild=guilds.nos) {
        identifier = identifier.trim();
        return guild.members.find(({ user }) => util.matchesUser(identifier, user)) || null;
    },

    sendToAuthorOf(message, ...sendArgs) {
        const text = `${util.resolveUser(message)} ${sendArgs.shift()}`;

        return message.channel.send(text, ...sendArgs)
                .catch(console.log);
    },

    async messageToUser(userResolvable, ...sendArgs) {
        const user = util.resolveUser(userResolvable);

        const channel = await user.createDM();

        return await channel.send(...sendArgs);
    },

    async messageAllToUser(userResolvable, ...sendArgsLists) {
        const user = util.resolveUser(userResolvable);

        const channel = await user.createDM();

        const messages = [];
        for (let sendArgs of sendArgsLists) {
            messages.push(await channel.send(...sendArgs));
        }

        return messages;
    },

    async getLastImageUrl(channel, maxMatches=50) {
        channel = util.resolveTextChannel(channel);
        if (!channel) return;

        const messages = await channel.fetchMessages({ limit: maxMatches });
        for (let message of messages.values()) {
            const attachment = message.attachments.values().next().value;
            if (attachment) return attachment.proxyURL;

            for (let embed of message.embeds) {
                if (embed.type === "image") return embed.url;
            }
        }

        return null;
    },

    async getLastImageAsAttachment(channel, maxMatches) {
        const url = await util.getLastImageUrl(channel, maxMatches);
        return url ? new Discord.Attachment(url) : null;
    },

    ifPlural(n, plural="s", singular="") {
        return parseFloat(n) !== 1 ? plural : singular;
    },

    log(type, details, detailsColor) {
        console.log(` [LLMA] ${util.getLogTypeColor(type)}[${type}]${util.getAnsiColor(detailsColor)} ${details}\x1b[0m`);
    },

    handlePromise(promise, message) {
        return promise.catch(error => {

            if (!(error instanceof Discord.DiscordAPIError)) return;

            switch (error.message) {
                case "Cannot send messages to this user":
                    console.log(message);

                    util.sendToAuthorOf(message,
                            "This message’s output has been restricted only to direct messages due to its potential length, and you have disabled this " +
                            "feature. Try again after enabling it."
                    );

                    break;

                default:
                    console.log("Uncaught: ", error);
                    break;
            }
        });
    },

    getAnsiColor(key) {
        const id = util.ansiColors[key];
        return `\x1b[${id ? id : "0"}m`;
    },
    ansiColors: {
        "gray": "0",
        "black": "0;30",
        "red": "0;31",
        "green": "0;32",
        "yellow": "0;33",
        "blue": "0;34",
        "magenta": "0;35",
        "cyan": "0;36",
        "white": "0;37",
        "redl": "1;31",
        "greenl": "1;32",
    },

    getLogTypeColor(key) {
        const color = util.logTypeColors[key];
        return util.getAnsiColor(color ? color : "gray");
    },
    logTypeColors: {
        "BOT": "greenl",
        "WSK": "yellow",
        "CMD": "cyan",
    },

    Command: null,
    self: null,

    AsyncFunction: (async () => {}).constructor,
    GeneratorFunction: (function* () {}).constructor,
    AsyncGeneratorFunction: (async function* () {}).constructor,
};
util.util = util;

module.exports = util;