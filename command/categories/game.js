const { Discord, client } = require("../../client.js");
const { sendToAuthorOf, resolveUser, messageToUser, ifPlural, appendToMessage, messageTimeoutDelete, Command } = require("../../util/util");
const TicTacToeGame = require("../TicTacToeGame");

class GameDescriptor {
    constructor(type, invokerMessage, callback) {
        this.type = type;
        this.invokerMessage = invokerMessage;
        this.callback = callback;
    }

    get gameName() {
        return gameNames.get(this.type);
    }
    get channel() {
        return this.invokerMessage.channel;
    }
    get host() {
        return this.invokerMessage.author;
    }
}

const gameNames = new Map();
gameNames.set(TicTacToeGame, "Tic Tac Toe");

const activeGame = (() => {
    const gameNextTimeout = 5000;
    const userQueueLimit = 2;

    let game;
    let channel;
    let host;

    reset();

    let prevChannel = null;
    let pendingGame = null;

    function reset() {
        game = {};
        channel = null;
        host = null;
    }

    const gameQueue = [];

    return {
        // Readies the next game
        next() {
            prevChannel = channel;

            timer.pause();

            if (!this.noGame) game.stop();
            if (pendingGame !== null) return; // To avoid overlaps

            if (prevChannel) {
                prevChannel.send(`_Yoy, this game is over._`);
            }
            
            const nextGame = gameQueue[0] || null;
            if (!nextGame) {
                reset();

                if (prevChannel) {
                    prevChannel.send(`_The game queue is empty now. Someone wanna start one? (\`${Command.cmdsCommand.prefixedName} game\`)_`);
                }

                return;
            }
            pendingGame = nextGame;
    
            if (prevChannel) {
                prevChannel.send(`_The next game will start in **${gameNextTimeout / 1000}** seconds in ${nextGame.channel}._`);
            }

            setTimeout(() => {
                const nextGame = gameQueue.shift();

                game = new nextGame.type();
                channel = nextGame.channel;
                host = nextGame.host;
                sendToAuthorOf(nextGame.invokerMessage, `_Your game of ${nextGame.gameName} is now playing!_\n\u200b`);
                nextGame.callback(game);
            }, gameNextTimeout);
        },

        // Stops the current game and begins the next one
        terminate() {
            if (!this.noGame) game.stop();
            pendingGame = null;
            this.next();
        },

        // Identical to terminate, but shows an informative message beforehand
        abort(reason="") {
            if (activeGame) {
                activeGame.channel.send(`_Game aborted${reason && ` automatically (${reason})`}_`);
            }
            activeGame.terminate();
        },

        // Queues a new game
        queue(descriptor) {
            // Does this user have too many already queued?
            const user = descriptor.invokerMessage.author;
            let queuedGamesFromUser = 0;
            for (let queuedGameDescriptor of gameQueue) {
                if (user === queuedGameDescriptor.host && ++queuedGamesFromUser >= userQueueLimit) {
                    const promise = sendToAuthorOf(descriptor.invokerMessage,
                        `Sorry, you’ve already reached your limit of **${userQueueLimit}** queued games. Wait for one of yours to start, and then you may ` +
                        `queue more.`
                    );
                    timeoutDeleteIfOngoingGame(promise, 8000);
                    return;
                }
            }

            // Add the game descriptor to the queue
            const position = gameQueue.push(descriptor);
            const promise = sendToAuthorOf(descriptor.invokerMessage, `_Your game has been queued at position **#${position}**_`);

            if (this.noGame) {
                this.next();
            }

            function timeoutDeleteIfOngoingGame(promise, timeout=6000) {
                if (!this.noGame) {
                    messageTimeoutDelete(promise, timeout, descriptor.invokerMessage, true);
                }
            }
        },

        get game() { return game; },
        get channel() { return channel; },
        get host() { return host; },
        get gameQueue() { return gameQueue; },

        get gameName() {
            return gameNames.get(game.constructor);
        },

        get noGame() {
            return Object.entries(game).length === 0;
        },
    };
})();

// Handles game timeouts
const timer = (() => {
    let interval = NaN;
    let lastClick = NaN;

    return {
        timeoutPeriod: 45000,

        click() {
            lastClick = Date.now();
            return this;
        },

        go() {
            if (isNaN(lastClick)) this.click(); // precaution

            interval = setInterval(() => {
                if (Date.now() - lastClick <= this.timeoutPeriod) return;
                
                activeGame.abort(`Nobody has moved in ${this.timeoutPeriod / 1000} seconds`);
                timer.pause();
            }, 1000);

            return this;
        },
        pause() {
            clearInterval(interval);
            interval = NaN;

            return this;
        },

        get paused() {
            return isNaN(interval);
        },
    };
})();

module.exports = [
    [async function gamequeue(message) {
        let gameString = activeGame.noGame ? "Nothing!" : `${activeGame.gameName} with ${activeGame.host} in ${activeGame.channel}`;
        let queueMessage = `**_NOW PLAYING_ : ${gameString}**\n\n`;

        const entryCount = activeGame.gameQueue.length;
        const maxIndexLength = entryCount.toString().length;

        for (let i = 0; i < entryCount; i++) {
            const descriptor = activeGame.gameQueue[i];
            const displayIndex = (i + 1).toString().padStart(maxIndexLength);
            const newLine = `**\`\u200b${displayIndex}\` ${descriptor.gameName}** with ${descriptor.host} in ${descriptor.channel}\n`;

            if (queueMessage.length + newLine.length <= 2000 - newLine.length) {
                queueMessage += newLine;
            } else {
                const remainder = entryCount - i;
                queueMessage += `\n_…and ${remainder} other${ifPlural(remainder)}_`;
                break;
            }
        }

        messageToUser(message, queueMessage);

        if (message.channel instanceof Discord.TextChannel) {
            message.react("📬");
        }
    }, {
        desc: "Messages the current game queue.",
        aliases: ["g", "gq"],
        subcommands: [
            [async function abandon(message) {
                if (activeGame.noGame) {
                    const promise = sendToAuthorOf(message, "There is no game currently running!");
                    messageTimeoutDelete(promise, 6000, message, true);
                } else if (message.author.id !== activeGame.host.id) {
                    const promise = sendToAuthorOf(message, "You are not the host of this game!");
                    messageTimeoutDelete(promise, 6000, message, true);
                } else {
                    activeGame.abort();
                }
            }, {
                desc: "Stops the ongoing game.",
                allowedInDM: false,
                aliases: ["stop", "end", "abort"],
            }],

            [async function rm(message, [index, user]) {
                let queue = activeGame.gameQueue;

                if (user) {
                    queue = queue.filter(({ host }) => host.id === user.id);
                }

                const targetGame = queue[index];
                if (!targetGame) {
                    sendToAuthorOf(message, "_No game found there_");
                    return;
                }

                const trueIndex = activeGame.gameQueue.indexOf(targetGame);
                sendToAuthorOf(message, `_Removed game ${trueIndex}_`);
            }, {
                desc: "Removes a game from the queue.",
                parameters: [{
                    name: "index",
                    required: true,
                    type: "int",
                    desc: "The index of the queued game",
                }, {
                    name: "user",
                    required: false,
                    type: "user",
                    desc: "The host user whose game is to be selected for deletion",
                }],
                aliases: ["unqueue", "remove", "rem"],
                allowedInDM: false,
                permittedRoles: ["206586936393990144"],
            }],
        ],
    }],

    [async function ttt(message, [challengee], { flags }) {
        challengee = challengee || message.author;

        activeGame.queue(new GameDescriptor(TicTacToeGame, message, async game => {
            timer.timeoutPeriod = 45000;

            const boardBuildingCleanup = message => {
                if (message.channel.id === activeGame.channel.id && message.author.id !== client.user.id) {
                    message.delete();
                }
            };

            // Unique but visually identical custom emojis so that multiple emoji reactions can be used on the same message
            const blankEmojiIds = ["478608216302026752", "478608223188811816", "478608231493795840"];
            const xEmojiIds = ["478622260484374528", "478622275789258782", "478622285075578891"];
            const oEmojiIds = ["478622321322491934", "478622329182617600", "478622336636026915"];
    
            // Used in the status messages. [0] is off, [1] is on
            const statusEmojiIds = [
                ["478622260484374528", "478623358959747073"], // x
                ["478622321322491934", "478622346433789963"], // o
            ];
    
            // Set game players
            let players;
            if (flags.includes("self")) { // Bot against self
                players = [client.user, client.user];
            } else {
                players = [message.author, challengee];
                if (flags.includes("melast")) {
                    players = players.reverse();
                }
            }

            game.players = players;
    
            client.on("message", boardBuildingCleanup); // so that no messages split the board

            // Status messages. X always comes first
            const xMessage = await message.channel.send("\u200b");
            const oMessage = await message.channel.send("\u200b");
            await updatePlayerMessages(true);
    
            // Make the board
            const pleaseWaitMessage = await message.channel.send("please wait while i set up the board...");
            const rowMessages = await createBoard();
            const rowMessageIds = rowMessages.map(rowMessage => rowMessage.id);
    
            await pleaseWaitMessage.delete();
            await updatePlayerMessages();

            // Start the timeout counter
            timer.click().go();
    
            client.off("message", boardBuildingCleanup); // no need to prevent splitting the board anymore

            let moving = false; // to avoid multiple simultaneous moves that break the display
    
            const onmessageReactionAdd = (reaction, user) => {
                user = resolveUser(user);

                if (
                    user.id === client.user.id // the bot added this reaction
                    || !rowMessageIds.includes(reaction.message.id) // the target message is not part of the game board
                    || !blankEmojiIds.includes(reaction.emoji.id) // the reaction does not represent a valid place to move
                    || user.id !== game.currentPlayer.id // the current player did not add this reaction
                    || moving // the bot is still trying to reset the board row after the previous move
                ) {
                    return; // do nothing
                }
    
                const x = rowMessageIds.indexOf(reaction.message.id);
                const y = blankEmojiIds.indexOf(reaction.emoji.id);
    
                move(x, y);
                reaction.remove(user);
            };
            client.on("messageReactionAdd", onmessageReactionAdd);
    
            await botRandMove();
    
            async function createBoard() {
                const rowMessages = [];
                for (let i = 0; i < 3; i++) {
                    rowMessages.push(await delay(createBoardRow(), 1000));
                }
                return rowMessages;
            }
    
            async function createBoardRow() {
                const rowMessage = await message.channel.send("\u200b");
    
                for (let i = 0; i < 3; i++) {
                    await delay(rowMessage.react(client.emojis.get(blankEmojiIds[i])), 750);
                }
    
                return rowMessage;
            }
    
            async function resetRowEmoji(rowMessageIndex, x=0) {
                const rowMessage = rowMessages[rowMessageIndex];
    
                // Delete all the reactions up to the point of the selected one
                for (let existingReaction of [...rowMessage.reactions.values()].slice(x).reverse()) { // reversed so that the bot removes them rtl
                    for (let user of existingReaction.users.values()) {
                        await delay(existingReaction.remove(user), 300);
                    }
                }
    
                // Add all the appropriate reactions
                for (let i = x; i < 3; i++) {
                    // Pick the right emoji and react with it
                    const emoji = [blankEmojiIds, xEmojiIds, oEmojiIds][game.board[rowMessageIndex][i] + 1][i];
                    await delay(rowMessage.react(emoji), 750);
                }
            }
    
            async function move(x, y) {
                if (!game.set(x, y)) return; // nothing happens if the move fails

                moving = true;
                timer.pause();
    
                await updatePlayerMessages(true); // switch off. Needs forceoff because it’s async (game.turn already has changed)
                await resetRowEmoji(x, y);
    
                if (!game.complete) {
                    await updatePlayerMessages(); // switch on
                    await botRandMove();
                } else {
                    await updatePlayerMessages(true, true); // This will append the win string
                    client.off("messageReactionAdd", onmessageReactionAdd); // no need to observe anymore
                    activeGame.terminate();
                    return;
                }

                timer.click().go();
                moving = false;
            }
    
            // Moves randomly for the bot if it is the current player.
            async function botRandMove() {
                if (game.currentPlayer.id !== client.user.id) return;
                
                const positions = game.getEmptyPositions();
                const position = positions[Math.floor(Math.random() * positions.length)];
                await move(...position);
            }
            
            function delay(promise, timeout) {
                return new Promise(resolve => {
                    setTimeout(() => {
                        promise.then(resolve);
                    }, timeout);
                });
            }
    
            function createPlayerMessageText(playerId, forceOff=false, showWinner=false) { // uses playerId so isTurn is checkable
                // Get player based on playerId
                const player = game.players[playerId];
    
                // Check whether it is the selected player’s turn
                const isTurn = playerId === game.turn;
    
                // Select the right emoji based on turn status
                const emojiIndex = forceOff ? 0 : Number(isTurn);
                const emojiId = statusEmojiIds[playerId][emojiIndex];

                // Makes the winner string if this player is the winner
                const winnerString = showWinner && game.winnerId === playerId ? "\t🎉🎉   🎉 v🎉🎉🎉🎉vvvv" : "";
    
                return `\u200b\t${client.emojis.get(emojiId)} ${player}${winnerString}`;
            }
    
            async function updatePlayerMessages(forceOff, showWinner) {
                await xMessage.edit(createPlayerMessageText(0, forceOff, showWinner));
                await oMessage.edit(createPlayerMessageText(1, forceOff, showWinner));
            }
        }));
    }, {
        desc: "Creates a playing area for Tic Tac Toe.",
        restParameterIndex: 0,
        parameters: [{
            name: "challengee",
            required: false,
            type: "user",
            desc: "The opposing user",
        }],
        parameterSyntax: "[...challengee]",
        flags: {
            "melast": "Swap the player order",
            "self": "Turn the bot against itself!!!! mwahahha",
        },
        aliases: ["tic", "nac"],
        allowedInDM: false,
    }],
];