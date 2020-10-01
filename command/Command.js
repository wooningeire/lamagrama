const { Discord, client, guilds } = require("../client.js");
const fs = require("fs");
const net = require("../socket.js");
const {
        util, sendToAuthorOf, log, messageTimeoutDelete, appendToMessage, ifPlural, resolveUser, resolveTextChannel, getLastImageUrl, AsyncFunction,
} = require("../util/util");
const Color = require("../Color");

const map = new WeakMap();
const _ = key => map.get(key);

class Command {
    constructor(body, {
        desc="",
        shortDesc="",
        parameters=[],
        parameterSyntax="",
        returns={},
        permittedChannels=[],
        permittedChannelCategories=[],
        permittedRoles=[],
        allowedInDM=true,
        requiredParameterIndex=Infinity,
        restParameterIndex=Infinity,
        requiresWebSocket=false,
        attachments=[],
        flags={},
        aliases=[],
        subcommands=[],
    }={}) {
        map.set(this, {});

        this.body = body;

        this.category = null;

        this.desc = desc;
        this.shortDesc = shortDesc;
        this.parameters = parameters;
        this.parameterSyntax = parameterSyntax;
        this.returns = returns={};
        
        this.permittedChannels = permittedChannels;
        this.permittedChannelCategories = permittedChannelCategories;
        this.permittedRoles = permittedRoles;

        this.allowedInDM = allowedInDM;

        this.restParameterIndex = restParameterIndex;

        this.requiresWebSocket = requiresWebSocket;
        this.attachments = attachments;

        this.flags = flags;

        this.aliases = aliases;
        this.supercommand = null;
        this.subcommands = subcommands.map(subcommandDef => {
            const subcommand = new Command(...subcommandDef);
            subcommand.supercommand = this;

            return subcommand;
        });
    }

    async parseInvocationAndCall(invokerMessage, startIndex=0, argsObjectProperties) {
        const invocation = invokerMessage.content;

        const args = getArguments(invocation, this.restParameterIndex + startIndex).slice(startIndex);
        const flags = getFlags(invocation); console.log(flags);

        await this.call(invokerMessage, args, flags, startIndex, argsObjectProperties);
    }
    
    call(invokerMessage, commandArgumentsRaw, commandFlags, startIndex=0, argsObjectProperties={}) {
        return new Promise(async resolve => {
            if (await this.checkCallingFailure(invokerMessage, commandArgumentsRaw)) return;

            const subcommand = this.subcommands.find(command => command.matches(commandArgumentsRaw[0]));
            if (subcommand) {
                if (startIndex === 0) {
                    argsObjectProperties.resolveBase = resolve;
                }

                await subcommand.parseInvocationAndCall(invokerMessage, ++startIndex, Object.assign(argsObjectProperties, {
                    resolveOuter: resolve,
                }));
            }

            let commandArguments = commandArgumentsRaw;
            if (this.parameters.length > 0) {
                commandArguments = commandArgumentsRaw.map((argument, i) => {
                    if (!this.parameters || !this.parameters[i]) return argument;

                    switch (this.parameters[i].type) {
                        case "int":
                            return parseInt(argument);

                        case "float":
                            return parseFloat(argument);

                        case "user":
                            return resolveUser(argument);

                        case "member":
                            return guilds.nos.member(resolveUser(argument));

                        case "text_channel":
                            return resolveTextChannel(argument);

                        case "color":
                            return new Color(argument);

                        case "list":
                            return getListItems(argument);

                        /*case "square_matrix":
                            return getSquareMatrix(argument);*/

                        default:
                            return argument;
                    }
                });
            }

            const argsObject = Object.assign(await this.createArgsObject(invokerMessage), {
                flags: commandFlags,
                argsRaw: commandArgumentsRaw,
            }, argsObjectProperties);

            const channelName = invokerMessage.channel.name;
            log("CMD", `Received command "${this.fullName}" from ${invokerMessage.author.tag} in ${channelName ? "#" + channelName : "a DM"}`);
            
            await invokerMessage.channel.startTyping();
            try {
                await this.body(invokerMessage, commandArguments, argsObject);
            } catch (error) {
                console.log(error.message);
            }
            await invokerMessage.channel.stopTyping();
        });
    }

    async checkCallingFailure(invokerMessage, commandArguments) {
        let failedMessageText = "";
        let failureType = "";
        if (invokerMessage.channel instanceof Discord.DMChannel && !this.allowedInDM) {
            failedMessageText =
                    `This command is restricted from use in direct messages. Please try again on a channel in the ` +
                    `NOS Discord.`;
            failureType = "permissions";
        }
        
        else if (!this.channelIsPermitted(invokerMessage.channel)) {
            failedMessageText = 
                    `Use of the \`${this.name}\` command is not allowed in this channel. Try ` +
                    `${this.listPermittedChannels(5)} instead.`;
            failureType = "permissions";
        }
        
        else if (!this.memberIsPermitted(invokerMessage.member)) {
            failedMessageText =
                    `You must have ${ifPlural(this.permittedRoles.length, "any of ")}the ${this.listPermittedRoles()} ` +
                    `role${ifPlural(this.permittedRoles.length)} to run the \`${this.name}\` command.`;
            failureType = "permissions";
        }
        
        else if (this.requiresWebSocket && (!net.connection || !net.connection.readyState)) {
            console.warn(" - Open a WebSocket connection first!");
            failedMessageText = 
                    `The command \`${this.name}\` requires a WebSocket conenction, which a silly little bot owner ` +
                    `forgot to open. Mention him mercilessly, please.`;
            failureType = "error";
        }
        
        else if (commandArguments.length < this.requiredArgumentCount) {
            failedMessageText = 
                    `The \`${this.name}\` command must be passed at least **${this.requiredArgumentCount}** argument${ifPlural(this.requiredArgumentCount)}.` +
                    ` You can view its syntax at \`${Command.cmdsCommand} ${this.fullName}\`.`;
            failureType = "error";
        }

        switch (failureType) {
            case "permissions": {
                const inTextChannel = invokerMessage.channel instanceof Discord.TextChannel;

                await invokerMessage.react("❌");

                const message = await sendToAuthorOf(invokerMessage, failedMessageText);
                await messageTimeoutDelete(message, undefined, invokerMessage, true);

                return failedMessageText;
            }

            case "error":
                await invokerMessage.react("〽");
                await sendToAuthorOf(invokerMessage, failedMessageText);
                return failedMessageText;
        }

        return false;
    }

    async createArgsObject(message) {
        const argsObject = {
            Command,
            saveAndSendFile: saveAndSendFile,
        };

        if (this.requiresWebSocket) {
            argsObject.connection = net.connection;
            argsObject.handleSocketTextCommand = handleSocketTextCommand;
        }

        if (this.attachments.length !== 0) {
            const url = await getLastImageUrl(message);
            argsObject.attachmentUrl = url;
        }

        return argsObject;
    }

    channelIsPermitted(channel) {
        return channel instanceof Discord.DMChannel
                ? this.allowedInDM
                : (!this.hasChannelRestrictions()
                        || this.permittedChannels.includes(channel.id)
                        || this.permittedChannelCategories.includes(channel.parentID)
                );
    }

    memberIsPermitted(member) {
        if (!member) return this.allowedInDM;
        if (this.permittedRoles.length === 0) return true;
        
        for (let roleId of member.roles.keys()) {
            if (this.permittedRoles.includes(roleId)) return true;
        }
        return false;
    }

    listPermittedChannels(maxListings) {
        const allPermittedChannels = this.allPermittedChannels();
        if (!maxListings) maxListings = allPermittedChannels.length;

        const listings = allPermittedChannels.slice(0, maxListings).map(id => `<#${id}>`);

        return formSentenceList(listings);
    }

    allPermittedChannels() {
        const channels = [...guilds.nos.channels.values()];

        const permittedIdList = [];

        for (let channel of channels) {
            if (channel instanceof Discord.TextChannel && this.channelIsPermitted(channel) && permittedIdList.indexOf(channel.id) === -1) {
                permittedIdList.push(channel.id);
            }
        }

        return permittedIdList;
    }

    listPermittedRoles(maxListings=this.permittedRoles.length) {
        const listings = this.permittedRoles.slice(0, maxListings).map(
            roleId => "@" + guilds.nos.roles.get(roleId).name
        );

        return formSentenceList(listings);
    }

    hasChannelRestrictions() {
        return this.permittedChannels.length !== 0 || this.permittedChannelCategories.length !== 0;
    }
    hasRoleRestrictions() {
        return this.permittedRoles.length !== 0;
    }

    generateSyntax() {
        let string = this.prefixedFullName;

        for (let i = 0; i < this.parameters.length; i++) {
            const parameter = this.parameters[i];

            const boundaries = i >= this.requiredParameterIndex ? "<>" : "[]";
            const prefix = i === this.restParameterIndex ? "..." : "";
            const type = parameter.type ? ": " + parameter.type : "";

            string += " " + boundaries[0] + prefix + parameter.name + type + boundaries[1];
        }

        return string;
    }

    matches(name) {
        return this.formalNames.includes(name) || this.aliases.includes(name);
    }

    async invokeHelp(message) {
        await Command.cmdsCommand.call(message, [this.name]);
    }

    toString() {
        return this.prefixedFullName;
    }

    get requiredArgumentCount() {
        let i = 0;
        for (let parameter of this.parameters) {
            if (!parameter.required) break;
            i++;
        }
        return i;
    }

    get path() {
        const cachedResult = _(this).path;
        if (cachedResult) return cachedResult;

        const commandList = [];
        let command = this;
        while (command) {
            commandList.unshift(command);
            command = command.supercommand;
        }
        _(this).path = commandList;
        return commandList;
    }

    get pathNames() {
        return this.path.map(command => command.name);
    }

    get name() {
        return this.body.name;
    }
    get prefixedName() {
        return Command.prefix + this.name;
    }
    get nameAndCategory() {
        return this.category
                ? `${this.category.name}.${this.name}`
                : this.name;
    }
    get prefixedNameAndCategory() {
        return Command.prefix + this.nameAndCategory;
    }

    get fullName() {
        return this.pathNames.join(" ");
    }
    get prefixedFullName() {
        return Command.prefix + this.fullName;
    }
    get fullNameAndCategory() {
        return this.path[0].category
                ? `${this.path[0].category.name}.${this.fullName}`
                : this.fullName;
    }

    get formalNames() {
        return [this.name, this.prefixedName, this.fullName, this.prefixedFullName, this.nameAndCategory, this.prefixedNameAndCategory];
    }

    get displayDesc() {
        return this.desc || this.shortDesc || "No description provided.";
    }

    get displayShortDesc() {
        return this.shortDesc || this.desc || "(no preview info)";
    }

    get displayPermittedChannels() {
        const permittedChannels = this.allPermittedChannels();

        return this.hasChannelRestrictions()
                ? permittedChannels.map(channelId => "#" + guilds.nos.channels.get(channelId).name).join(", ")
                : "any";
    }

    get displayPermittedRoles() {
        return this.hasRoleRestrictions()
                ? this.permittedRoles.map(roleId => "@" + guilds.nos.roles.get(roleId).name).join(", ")
                : "any";
    }

    get syntax() {
        return this.parameters.length !== 0 ? this.generateSyntax() : `${this} ${this.parameterSyntax}`;
    }

    static loadAll() {
        return new Promise(resolve => {
            const folderName0 = "./command/categories/";
            const folderName1 = "./categories/";
            fs.readdir(folderName0, (error, files) => {
                for (let fileName of files) {
                    const categoryName = fileName.slice(0, fileName.lastIndexOf(".js"));
                    log("CMD", `Loading category "${categoryName}"`, "cyan");
                    this.define(categoryName, require(folderName1 + fileName));
                }
                resolve();
            });
        });
    }

    static define(categoryName, ...commandArgLists) {
        const newCategory = new Category();
        this.commands[categoryName] = newCategory;

        for (let commandArgList of commandArgLists[0]) {
            const commandName = commandArgList[0].name.toLowerCase();
            const commandNameAndCategory = `${categoryName}.${commandName}`;

            const existingCommand = this.get(commandName);
            if (existingCommand) {
                log("CMD", `Name clash: A command of name "${commandName}" already exists in category "${existingCommand.category.name}". ` +
                        `${commandNameAndCategory}" will not be defined`, "red");
                continue;
            }

            log("CMD", `Defined command "${commandNameAndCategory}"`, "green");
            const command = new Command(...commandArgList);
            command.category = newCategory;
            newCategory.commands[commandName] = command;

            if (!(command.body instanceof AsyncFunction)) {
                log("CMD", `"${commandNameAndCategory}" is not async`, "yellow");
            }
        }
    }

    static get(name) {
        if (typeof name !== "string") return false;

        name = name.toLowerCase();
        for (let category of Object.values(this.commands)) {
            const command = category.get(name);
            if (command) return command;
        }
        return false;
    }

    static getAll() {
        const cmdList = [];
        for (let category of Object.values(this.commands)) {
            category.forEach(command => {
                cmdList.push(command);
            });
        }
        return cmdList;
    }

    static getCategory(name) {
        return this.commands[name] || false;
    }
    
    static setCmdsCommand(commandResolvable) {
        const command = this.resolve(commandResolvable);
        this.cmdsCommand = command;
    }

    static resolve(arg) {
        if (arg instanceof this) {
            return arg;
        } else if (typeof arg === "string") {
            return this.get(arg.toLowerCase().trim());
        }
        return arg;
    }

    static searchName(invocation) {
        const nameRegEx = new RegExp(`^${Command.prefix}(.*?)(?:\\s|$)`);
    
        return nameRegEx.exec(invocation)[1];
    }
}
util.Command = Command;

Command.commands = {};
Command.prefix = "l:";
Command.flagPrefix = "--";
Command.commentPrefix = "#";

Command.loadAll()
        .then(() => {
            Command.setCmdsCommand("cmds");
        });

class Category {
    constructor({ desc="", hidden=false }={}) {
        this.desc = desc;
        this.commands = {};
    }

    get(name) {
        const command = this.commands[name];
        if (command) return command;

        for (let command of this) {
            if (command.matches(name)) {
                return command;
            }
        }
        return false;
    }

    forEach(callback) {
        for (let command of this) {
            callback(command);
        }
        return this;
    }

    get name() {
        for (let [name, category] of Object.entries(Command.commands)) {
            if (category === this) return name;
        }
        return null;
    }

    get displayShortDesc() {
        return this.desc || "(no info)";
    }

    * [Symbol.iterator]() {
        yield* Object.values(this.commands);
    }
}

function getArguments(invocation, restParameterIndex=Infinity) {
    //  /(?:(?:(?:^|\s)")((?:\\?.)*?)(?:"(?:\s|$))|((?<=\s)(?!(?:${Command.flagPrefix}|${Command.commentPrefix}))\S+))/g
    //
    //  /                                                                                                             /g    Find any arguments in a string
    //   (?:                                                                                                         )      No need to capture entire match
    //                                                Find any quoted arguments (only content is captured, not quotes)
    //      (?:(?:^|\s)")                             Find a quote that is preceded by an argument-opening character
    //                   ((?:\\?.)*?)                 Get the content between a the opener and the terminator (checks for quote-escapers "\")
    //                               (?:"(?:\s|$))    Find a quote that is followed by an argument-terminating character
    //                                            |   Alternatively…
    // Find any bare arguments (all is content)    (                                                                )
    // Check for preceding whitespace               (?<=\s)
    // Verify that the argument is not a flag or comment   (?!(?:${Command.flagPrefix}|${Command.commentPrefix}))
    // Match everything up until the next whitespace (i.e. the next argument opener)                             \S+
    const argumentRegEx = new RegExp(
        `(?:(?:(?:^|\\s)")((?:\\\\?.)*?)(?:"(?:\\s|$))|((?<=\\s)(?!(?:${Command.flagPrefix}|${Command.commentPrefix}))\\S+))`, "g"
    );
    const argumentsList = [];

    let i = 0;
    let lastIndex = invocation.search(/(\s|$)/);
    let groups = argumentRegEx.exec(invocation);
    while (groups && i++ < restParameterIndex) {
        argumentsList.push(takeFirstDefined(groups[1], groups[2]));
        lastIndex = argumentRegEx.lastIndex; // so that the final exec doesn't count
        groups = argumentRegEx.exec(invocation);
    }
    
    const flagRegEx = new RegExp(`(^|\\s)${Command.flagPrefix}\\S+`, "g");
    const restArgument = invocation.slice(lastIndex).replace(flagRegEx, "").trim();
    if (restArgument) argumentsList.push(restArgument);

    return argumentsList;
}

// Returns all regex matches of a string in an array
function basicGet(regEx, string) {
    const list = [];

    let groups = regEx.exec(string);
    while (groups && groups.groups) {
        list.push(groups[1]);
        groups = regEx.exec(string);
    }
    return list;
}

function getFlags(invocation) {
    //  /(?:(?:^|\s)${Command.flagPrefix})(\S+)/g
    //
    //  /                                      /g    Find any flags in a string
    //   (?:                             )           Don’t include the flag prefix
    //      (?:^|\s)${Command.flagPrefix}            Find a flag prefix that starts an argument
    //                                    (\S+)      Capture only the content of the flag
    return basicGet(new RegExp(`(?:(?:^|\\s)${Command.flagPrefix})(\\S+)`, "g"), invocation);
}

function getListItems(listString) {
    return basicGet(/((?:\\?.)*?)(?:;|$)/g, listString);
}

function getSquareMatrix(listString) {
    // Truncate to the greatest possible square
    let list = getListItems(listString);
    const sideLength = Math.sqrt(list);
    const wholeSideLength = Math.floor(sideLength);
    if (sideLength !== wholeSideLength) {
        list = list.slice(0, wholeSideLength);
    }

    for (let i = 0; i < list.length; i++) {
        list[i] = Math.floor(list[i]);
    }

    return getListItems(listString);
}

function takeFirstDefined(...args) {
    for (let arg of args) {
        if (arg !== undefined) return arg;
    }
}

function handleSocketTextCommand(string, responses={}) {
    const commandType = string.slice(0, string.indexOf(" "));
    const commandRest = string.slice(string.indexOf(" ") + 1);
    
    if (responses[commandType]) responses[commandType](commandRest);
}

const saveAndSendFile = (() => {
    let imageProcessNum = 0; // To avoid filename collisions

    return function saveAndSendFile(message, dataURL) {
        const matches = dataURL.match(/^data:.+\/(.+);base64,(.*)$/);
        const extension = matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, "base64");

        imageProcessNum++;
        imageProcessNum %= 2**31 - 1; // arbitrary limit
        const path = `./tmp/${imageProcessNum}.${extension}`;
        fs.writeFileSync(path, buffer);
        const attachment = new Discord.Attachment(path);
        
        sendToAuthorOf(message, "", attachment)
                .finally(() => {
                    fs.unlinkSync(path);
                });
    };
})();

function formSentenceList(listings) {
    if (listings.length === 1) {
        return listings[0];
    } else if (listings.length === 2) {
        return `${listings[0]} or ${listings[1]}`;
    } else {
        const string = listings.join(", ");
        const lastSpaceIndex = string.lastIndexOf(" ");
        return `${string.substring(0, lastSpaceIndex)} or${string.substring(lastSpaceIndex)}`;
    }
}

module.exports = Command;