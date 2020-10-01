const { Discord, client } = require("../../client.js");
const { antiping, sendToAuthorOf, messageToUser, messageAllToUser, resolveUser, respondPromise, Command } = require("../../util/util");

module.exports = [
    [async function cmds(message, [commandName, ...subcommandNames], { Command }) {
        let text = "";

        if (commandName) {
            commandName = commandName.toLowerCase();

            if (commandName.startsWith(Command.prefix)) {
                commandName = commandName.slice(Command.prefix.length);
            }
        }

        // easter egg
        if (commandName === "me") {
            await sendToAuthorOf(message,
                "Huh? Boy, are you stuck in that well *again*? For the twenty-first time, *how*?! …You know what, I can’t take this any longer. You help " +
                "yourself, dang it."
            );
            return;
        }

        let command = Command.get(commandName);
        let category = Command.getCategory(commandName);

        if (command) {
            for (let name of subcommandNames) {
                const subcommand = command.subcommands.find(subcommand => subcommand.matches(name));

                if (subcommand) {
                    command = subcommand;
                } else {
                    break;
                }
            }

            text = produceCommandDoc(command);
        } else if (category) {
            text = initiateText(`Commands : ${category.name}`);
            text += generateList(Object.values(category.commands), () => true, "< " + Command.prefix);
        } else {
            if (commandName) text = "Invalid command or category name.";
            text += initiateText("Categories");
            text += generateList(Object.values(Command.commands), category => !category.hidden, "{ ", ` : "`, `" }`);
        }

        text += "```";

        await sendToAuthorOf(message, text);
        
        function generateList(list, check=() => true, prefix="< ", infix=" > ", postfix="") {
            let text = "";
        
            const maxNameLength = Math.max(...list.map(value => value.name.length ));
            for (let value of list) {
                if (!check(value)) continue;
                text += "  " + prefix + value.name.padEnd(maxNameLength) + infix + value.displayShortDesc + postfix + " \n";
            }
        
            text += `  /*
To list the commands of a category, type "${Command.cmdsCommand.prefixedName} <category-name>"
To view a command’s documentation, type "${Command.cmdsCommand.prefixedName} <command-name>"`;
        
            return text;
        }
    }, {
        desc: "Displays documentation about a given command, lists the commands within a given category, or lists all categories.",
        parameters: [{
            name: "command_or_category_name",
            required: false,
        }, {
            name: "subcommand_names",
            required: false,
        }],
        permittedChannelCategories: ["355888265678684161"],
        aliases: ["help", ""],
    }],

    [async function about(message, [page], { Command }) {
        switch (page) {
            default: {
                const channel = await resolveUser(message).createDM();

                const text =
`Howdy! I’m ${client.user.username}, the homemade general-purpose Discord bot created by %s specifically for the NOS Discord guild.
    • My list of commands can be found by invoking \`${Command.cmdsCommand}\`!
    • Confused by command syntax? Take a look at \`${this} syntax\`. (Warning: there’s reading!)
    • The rewritten version (the one that you’re using right now) of me began its development on August 7, 2018. The older one happened in July 25, 2017!
    • This version is very new, so bugs and unexpected behavior may be prevalent. Beware!
    • Also due to this, some aspects of me may be unfinished (like this ${this.name} page itself!). Suggestions for features are still open!`;

                await antiping(channel, text, resolveUser("188852618456596480"));
                break;
            }

            case "syntax": {
                const text = [[
`So you need some help with that wacky command syntax, huh? Well, here’s how to invoke that command you’ve always wanted to! Or just learned about, I don’t ` +
        `know.`], [/*
`Let’s take a look at a sample help message:
${produceCommandDoc(Command.get("echo"), true)}`], [
`The first line has the command name in the form \`<category>.<command>\`. Using \`${Command.cmdsCommand} <category>\`, you can view the ` +
        `other commands in the category.

The first line of the documentation shows the text necessary to invoke the command, in brackets. This will typically be just its raw name with the bot ` +
        `prefix, \`${Command.prefix}\`.

Next is the \`Syntax\`. This text shows each of the parameters that can be filled when calling the command. Parameter names in **arrow brackets** (\`<>\`) ` +
        `are **required**—as an extra level of security, the command will refuse to run if the passed arguments are missing. Those in **square brackets** ` +
        `(\`[]\`) are **optional** and the command will run even if not provided.`], [`
An argument list passed to a command is a **space-separated list**. In the call \`${Command.get("listargs")} 0 1 2 3\`, each of the digits ` +
        `belong to its own parameter. To pass spaces in an argument, surround the full argument text with **block double quotes** (\`""\`). These will be ` +
        `removed when the call is parsed. If there is a starting double quote that you didn’t add for grouping, use a backslash (\`\\\`) before it to ` +
        `escape it.

Sometimes, however, the quotes are not necessary, like for \`${Command.get("echo")}\`. Such commands make use of **rest parameters**, which are denoted by ` +
        `an ellipsis preceding the name of the final parameter (for example, \`[...text]\`). Quotes and spaces passed here will be kept.

The next section lists the \`Flags\`. These are extra options used for features that don’t warrant or would be too cumbersome for their own parameters. ` +
        `Flags are denoted in a call by the text \`${Command.flagPrefix}\` followed by the name of the flag. The result of the flag is listed in the target ` +
        `command’s documentation. **Flags will not appear in rest parameters!** If text of the flag form is to be passed as an argument: like quotes, use a ` +
        `backslash before it to escape it.

    *(If this is still mildly cryptic to you, you can play with \`${Command.get("listargs")}\` and \`${Command.get("listargs3")}\` in this DM to see what ` +
        `is passed and what isn’t.)*

The last two sections, \`Channels\` and \`Roles\`, list the permissions necessary to run the command. If one does not appear in a command’s documentation, ` +
        `then its restrictions do not apply.`], [
`Woo, boy, that was a mouthful. Anyway, happy Llamaing!`*/
`\`\`\`ini\n[ Basics ]\`\`\`Start by typing this bot’s **prefix**, \`${Command.prefix}\`. Immediately follow this with the name of the command you want to ` +
        `invoke, such as “\`${Command.cmdsCommand.name}\`”, where you would type “\`${Command.prefix}${Command.cmdsCommand.name}\`”. Follow the command ` +
        `name with any **arguments** you want or need to pass to the command—you can view these in its command documentation. The list of arguments is a ` +
        `space-separated list of text. To include spaces in an argument, surround the entire text in double quotation marks.`], [
`\`\`\`ini\n[ Flags ]\`\`\`Flags are special parameters that can be switched on or off by passing the prefix \`${Command.flagPrefix}\` followed by the ` +
        `wanted flag’s name. These are not parsed as arguments and as such are not included in the argument list, but they still have special behaviors ` +
        `when enabled, which are also documented in its \`${Command.cmdsCommand.name}\` menu.`], [
`\`\`\`ini\n[ Comments ]\`\`\`Comments, prefixed by \`${Command.commentPrefix}\`, are too excluded from the arguments list, but unlike flags, they do not ` +
        `perform any behavioral changes. Use these when there are infinite parameters but you want to take advantage of some Discord mechanism to ` +
        `manipulate a search result, such as using an image URL when calling \`${Command.get("convolve")}\` or triggering searches for mentions in a ` +
        `message.`], [
`    *(If this is still mildly cryptic to you, you can play with \`${Command.get("listargs")}\` and \`${Command.get("listargs3")}\` in this DM to see what ` +
        `is passed and what isn’t.)*`
                ]];

                await messageAllToUser(message, ...text);
                break;
            }
        }

        if (message.channel instanceof Discord.TextChannel) {
            await message.react("📬");
        }
    }, {
        desc: "Shows basic introductory information.",
        parameters: [{
            name: "page_name",
            required: false,
        }],
        aliases: ["hi"],
    }]
];

function produceCommandDoc(command, close=false) {
    let text = initiateText(`Command : ${command.fullNameAndCategory}`);

    text += `
[ ${command} ]
    ${command.displayDesc}

 .Syntax
    ${command.syntax}`;

    const flagsList = Object.entries(command.flags);
    if (flagsList.length !== 0) {
        text += `\n\n .Flags`;
        for (let flag of flagsList) {
            text += `\n    ${Command.flagPrefix}${flag[0]} : ${flag[1]}`;
        }
    }

    if (command.subcommands.length !== 0) {
        text += `\n\n .Subcommands\n    ${command.subcommands.map(subcommand => subcommand.name).join(", ")}`;
    }

    const permittedChannelsDoc = command.displayPermittedChannels;
    if (permittedChannelsDoc !== "any") {
        text += `\n\n .Channels\n    ${command.displayPermittedChannels}`;
    }

    const permittedRolesDoc = command.displayPermittedRoles;
    if (permittedRolesDoc !== "any") {
        text += `\n\n .Roles\n    ${command.displayPermittedRoles}`;
    }

    if (command.aliases.length !== 0) {
        text += `\n\n .Aliases\n    ${command.aliases.join(", ")}`;
    }

    if (close) text += "```";

    return text;
}

function initiateText(header) {
    return `\`\`\`css\n -–—={ ${client.user.username} : command reference } ${header} =—–-\n\n`;
}