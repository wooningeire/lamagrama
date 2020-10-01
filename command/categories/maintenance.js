const { guilds } = require("../../client.js");
const { antiping, messageTimeoutDelete, ifPlural, sendToAuthorOf, resolveUser, matchesUser, getGuildUser } = require("../../util/util.js");

module.exports = [
    [async function kick(message, [identifier, reason]) {
        const targetMember = getGuildUser(identifier);

        if (targetMember) {
            //try {
                await targetMember.kick(reason);
            //    await sendToAuthorOf(message, `Kicked ${user}.`);
            //} catch (error) {
            //    await antiping(message.channel, `${resolveUser(message)} I don’t have permission to kick %s here.`, targetMember.user);
            //}
        } else {
            await sendToAuthorOf(message, `I can’t find user given "${identifier}".`);
        }
    }, {
        desc: "Kicks a member from the guild.",
        parameters: [{
            name: "user",
        }, {
            name: "reason",
        }],
        requiredParameterIndex: 0,
        restParameterIndex: 1,
        permittedRoles: ["206586936393990144"],
    }],

    [async function jail(message, [member, duration]) {
        member.addRole();
    }, {
        desc: "Jails a user for a specified amount of time",
        parameters: [{
            name: "target",
            type: "member",
            required: true,
        }, {
            name: "duration",
            type: "time",
        }],
        permittedRoles: ["206586936393990144"],
    }],

    /*[async function typers(message, [channel]) {
        if (!channel) channel = message.channel;

        sendToAuthorOf(message, channel.);
    }, {
        desc: "Displays who is typing.",
        parameters: [{
            name: "channel",
            type: "text_channel",
        }],
    }],*/

    [async function bulkdel(message, [amount]) {
        amount = parseInt(amount);

        amount = Math.max(0, Math.min(99, amount));

        await message.channel.bulkDelete(amount + 1);
        
        const newMessage = await sendToAuthorOf(message, `Removed **${amount}** message${ifPlural(amount)}.`);
        await messageTimeoutDelete(newMessage);
    }, {
        desc: "Deletes the past <n> messages in a channel.",
        parameters: [{
            name: "n",
            required: true,
        }],
        allowedInDM: false,
        permittedRoles: ["206586936393990144"],
    }],

    [async function restart(message) {
        await sendToAuthorOf(message, "👋");
        process.exit(0);
    }, {
        desc: "Restarts the bot to load any changes.",
        allowedInDM: false,
        permittedRoles: ["206586936393990144"],
    }],
];