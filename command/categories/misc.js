const { Discord } = require("../../client.js");
const { sendToAuthorOf, appendToMessage, ifPlural } = require("../../util/util.js");
const Color = require("../../Color");

module.exports = [
    [async function jpegify(message, [quality], { attachmentUrl, connection, handleSocketTextCommand, saveAndSendFile }) {
        if (!attachmentUrl) {
            await sendToAuthorOf(message, "I searched the past fifty messages and didn’t find an image. Try uploading it again.");
            return;
        }

        connection.sendText(`jpegify ${attachmentUrl} ${quality}`);
        connection.once("text", string => {
            handleSocketTextCommand(string, {
                "attachmenturl": rest => { saveAndSendFile(message, rest); },
            });
        });
    }, {
        desc: "Converts an image to a JPEG with very high compression.",
        parameters: [{
            name: "quality",
            type: "float",
            required: false,
            desc: "Quality of the JPEG compression",
        }],
        attachments: [{
            required: true,
        }],
        requiresWebSocket: true,
        permittedChannelCategories: ["355888265678684161"],
        permittedRoles: ["234059265428422656"],
    }],

    [async function echo(message, [text], { flags }) {
        await message.channel.send(text || "\u200b");

        if (flags.includes("d") && message.channel instanceof Discord.TextChannel) {
            await message.delete();
        }
    }, {
        desc: "Repeats the message content.",
        flags: {
            "d": "Delete the invocation message",
        },
        parameters: [{
            name: "text",
            required: true,
        }],
        restParameterIndex: 0,
        permittedRoles: ["206586936393990144"],
    }],

    [async function color(message) {
        await this.invokeHelp(message);
    }, {
        desc: "Container for various color commands.",
        permittedChannelCategories: ["355888265678684161"],
        subcommands: [
            [async function solid(message, [color], { connection, handleSocketTextCommand, saveAndSendFile }) {
                connection.sendText(`color.solid ${color}`);
                connection.once("text", string => {
                    handleSocketTextCommand(string, {
                        "attachmenturl": rest => { saveAndSendFile(message, rest); },
                    });
                });
            }, {
                desc: "Uploads a 50×50px PNG of a given solid color.",
                parameters: [{
                    name: "color",
                    required: true,
                    type: "color",
                }],
                requiresWebSocket: true,
                restParameterIndex: 0,
            }],

            [async function values(message, [targetColor], { argsRaw }) {
                const fixation = 3;
                
                const embed = new Discord.RichEmbed()
                        .setColor(targetColor.toInteger())
                        .setTitle(`Values for __${argsRaw[0]}__`)
                        .setDescription(`Resolves to ${targetColor.toString("rgba", fixation)}`)
        
                        .addField("Red", targetColor.r, true)
                        .addField("Green", targetColor.g, true)
                        .addField("Blue", targetColor.b, true)
        
                        .addField("Hue", targetColor.h.toFixed(fixation), true)
                        .addField("Saturation", targetColor.s.toFixed(fixation), true)
                        .addField("Lightness", targetColor.l.toFixed(fixation), true)
        
                        .addField("Key", targetColor.k, true)
                        .addField("Saturation (HSV)", targetColor.sHSV.toFixed(fixation), true)
                        .addField("Value", targetColor.v, true)
        
                        .addField("Cyan", targetColor.c.toFixed(fixation), true)
                        .addField("Magenta", targetColor.m.toFixed(fixation), true)
                        .addField("Yellow", targetColor.y.toFixed(fixation), true)
        
                        .addField("Alpha", targetColor.a)
                        
                        .addField("RGBA", targetColor.toString("rgba", fixation), true)
                        .addField("HSLA", targetColor.toString("hsla", fixation), true)
                        .addField("Hexadecimal", targetColor.toString("hex", fixation), true)
        
                        .addField("RGB", targetColor.toString("rgb", fixation), true)
                        .addField("HSL", targetColor.toString("hsl", fixation), true)
                        .addField("Decimal", targetColor.toInteger(), true)
        
                        .setFooter(`Any values betwen Red and Alpha (inclusive) are out of 255`);
                    
                await sendToAuthorOf(message, "", embed);
            }, {
                desc: "Calculates basic values and generates varying formats of a given color.",
                parameters: [{
                    name: "color",
                    required: true,
                    type: "color",
                }],
                restParameterIndex: 0,
            }],

            [async function dist(message, [col0, col1], { argsRaw }) {
                const embed = new Discord.RichEmbed()
                        .setColor(col0.toInteger())
                        .setTitle(`Distance between __${argsRaw[0]}__ and __${argsRaw[1]}__`)
                        .setDescription(`Resolve to ${col0.toString("rgba", 3)} and ${col1.toString("rgba", 3)} respectively`)
        
                        .addField("Distance", Math.sqrt((col0.r - col1.r) ** 2 + (col0.g - col1.g) ** 2 + (col0.b - col1.b) ** 2))
        
                        .addField("Red difference", col0.r - col1.r, true)
                        .addField("Green difference", col0.g - col1.g, true)
                        .addField("Blue difference", col0.b - col1.b, true)
        
                        .setFooter("Assuming R, G, and B are in the interval [0, 255]");
                    
                await sendToAuthorOf(message, "", embed);
            }, {
                desc: "Calculates the distance between two colors.",
                parameters: [{
                    name: "color0",
                    required: true,
                    type: "color",
                }, {
                    name: "color1",
                    required: true,
                    type: "color",
                }],
                returns: {
                    type: "float",
                    desc: "The distance in space between the two colors",
                },
                aliases: ["diff", "distance", "difference"],
            }],

            [async function random(message, [amount=1]) {
                amount = Math.max(0, Math.min(128, isNaN(amount) ? 1 : amount));

                const colors = [];
                for (let i = 0; i < amount; i++) {
                    colors.push(Color.random());
                }
                
                const embed = new Discord.RichEmbed()
                        .setColor(colors[0] ? colors[0].toInteger() : undefined)
                        .setTitle(`${amount} random color${ifPlural(amount)}!`)
        
                        .addField("Entries", colors.map(color => color.toString("hex")).join(" ") || "\u200b");
                    
                await sendToAuthorOf(message, "", embed);
            }, {
                desc: "Generates a given number of random colors.",
                parameters: [{
                    name: "amount",
                    required: true,
                    type: "int",
                }],
                aliases: ["rand"],
            }],
        ],
    }],

    [async function convolve(message, weightsMatrix, { attachmentUrl, connection, handleSocketTextCommand, saveAndSendFile }) {
        if (!attachmentUrl) {
            await sendToAuthorOf(message, "I searched the past fifty messages and didn’t find an image. Try uploading it again.");
            return;
        }

        connection.sendText(`convolve ${attachmentUrl} ${weightsMatrix}`);
        connection.once("text", string => {
            handleSocketTextCommand(string, {
                "attachmenturl": rest => { saveAndSendFile(message, rest); },
                "error": rest => { sendToAuthorOf(message, rest); },
            });
        });
    }, {
        shortDesc: "Applies a convolution matrix to an image.",
        desc: "Takes a matrix of multipliers and iterates through each pixel (an “anchor”) of an image, applying each multiplier to each channel of the " +
                "corresponding pixel relative to the anchor and summing the resulting values for each channel within the matrix’s range. The resulting " +
                "pixel’s channel values are these sums.",
        parameters: [{
            name: "weights",
            type: "square_matrix",
            required: true,
            desc: "The convolution matrix",
        }],
        attachments: [{
            required: true,
        }],
        requiresWebSocket: true,
        permittedChannelCategories: ["355888265678684161"],
        permittedRoles: ["234059265428422656"],
        aliases: ["cvl"],
    }],

    [async function scale(message, [factor], { attachmentUrl, connection, handleSocketTextCommand, saveAndSendFile }) {
        if (!attachmentUrl) {
            await sendToAuthorOf(message, "I searched the past fifty messages and didn’t find an image. Try uploading it again.");
            return;
        }

        connection.sendText(`scale ${attachmentUrl} ${factor || 0}`);
        connection.once("text", string => {
            handleSocketTextCommand(string, {
                "attachmenturl": rest => { saveAndSendFile(message, rest); },
                "error": rest => { sendToAuthorOf(message, rest); },
            });
        });
    }, {
        shortDesc: "Applies a scalar transformation to an image.",
        parameters: [{
            name: "scalar",
            type: "float",
            required: true,
            desc: "The number by which to multiply the image’s dimensions",
        }],
        attachments: [{
            required: true,
        }],
        requiresWebSocket: true,
        permittedChannelCategories: ["355888265678684161"],
        permittedRoles: ["234059265428422656"],
    }],
];