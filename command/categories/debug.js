const { Discord } = require("../../client.js");
const { sendToAuthorOf, appendToMessage, getLastImageAsAttachment } = require("../../util/util.js");

module.exports = [
    [async function ding(message) {
        const message = await sendToAuthorOf(message, "dang");
        await appendToMessage(message,` \`${newMessage.createdAt - message.createdAt}ms\``);
    }, {
        desc: "Used to test connection strength or whether commands are working correctly.",
        permittedChannelCategories: ["355888265678684161"],
    }],

    [async function listargs(message, args) {
        const length = args.length;
        const logLength = length.toString().length;
    
        let i = 0;
        const text = "[\n" + args.map(arg => `  **\`\u200b${(i++).toString().padStart(logLength)}\`** "${arg}"`).join("\n") + "\n]";
    
        if (text.length > 1980) {
            await sendToAuthorOf("Result message is too long");
            return;
        }
    
        await sendToAuthorOf(message, text);
    }, {
        desc: "Lists the arguments passed along with their indices.",
        parameterSyntax: "[arg0] [arg1] [arg2] ... [argN]",
        permittedChannelCategories: ["355888265678684161"],
        permittedRoles: ["206586936393990144"],
    }],

    [async function listargs3(message, args, { Command }) {
        await Command.get("listargs").call(message, args);
    }, {
        desc: "Lists the arguments passed along with their indices, but parsed with a rest parameter at index 3.",
        parameters: [{
            name: "arg0",
            required: false,
        }, {
            name: "arg1",
            required: false,
        }, {
            name: "arg2",
            required: false,
        }, {
            name: "arg3",
            required: false,
        }],
        restParameterIndex: 3,
        permittedChannelCategories: ["355888265678684161"],
        permittedRoles: ["206586936393990144"],
    }],

    [async function lastimg(message) {
        const attachment = await getLastImageAsAttachment(message);
        if (!attachment) {
            await sendToAuthorOf(message, "No image found");
            return;
        }
        await sendToAuthorOf(message, "", attachment);
    }, {
        permittedChannelCategories: ["355888265678684161"],
        permittedRoles: ["206586936393990144"],
    }],

    [async function type(message) {
        await message.channel.startTyping();
    }, {
        permittedChannelCategories: ["355888265678684161"],
        permittedRoles: ["206586936393990144"],
    }],

    [async function untype(message) {
        await message.channel.stopTyping();
    }, {
        permittedChannelCategories: ["355888265678684161"],
        permittedRoles: ["206586936393990144"],
    }],
];