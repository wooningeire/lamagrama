const { Discord, client, guilds } = require("../client.js");
const { mention } = require("../util/util");

let gatelogChannel;
client.on("ready", () => {
    gatelogChannel = client.channels.get("269260209497571338");
});

client.on("guildMemberAdd", member => {
    if (member.guild !== guilds.nos) return;
    const time = Date.now();

    const user = member.user;

    const embed = new Discord.RichEmbed()
            .setColor(4437377)
            .setTitle(`📥 User join — **${Discord.escapeMarkdown(user.username)}**#${user.discriminator} (${user.id})`)
            .setThumbnail(user.displayAvatarURL)
            
            .addField("Mention", user, true)
            .addField("New member count", guilds.nos.members.size, true)

            .addField("Member join date", formatDate(member.joinedAt), true)
            .addField("Account creation date", formatDate(user.createdAt), true)

            .addField("Account age", formatTimeElapsed(user.createdAt, member.joinedAt), true)
            
            .setFooter(`Message sent ${formatDate(Date.now())}`);
            
    gatelogChannel.send("", embed);
});

client.on("guildMemberRemove", member => {
    if (member.guild !== guilds.nos) return;

    const user = member.user;

    const embed = new Discord.RichEmbed()
            .setColor(15746887)
            .setTitle(`📤 User exit — **${Discord.escapeMarkdown(user.username)}**#${user.discriminator} (${user.id})`)
            .setThumbnail(user.displayAvatarURL)
            
            .addField("Mention", user, true)
            .addField("New member count", guilds.nos.members.size, true)

            .addField("Member join date", formatDate(member.joinedAt), true)
            .addField("Member leave date", formatDate(Date.now()), true)

            .addField("Membership span", formatTimeElapsed(member.joinedAt), true)
            .addField("Account creation date", formatDate(user.createdAt), true)
            
            .setFooter(`Message sent ${formatDate(Date.now())}`);
            
    gatelogChannel.send("", embed);
});

/*client.on("guildBanAdd", (guild, user) => {
    if (guild !== guilds.nos) return;

    const embed = new Discord.RichEmbed()
            .setColor(2303786)
            .setTitle(`🍌 User banned — **${Discord.escapeMarkdown(user.username)}**#${user.discriminator}`)
            
            .addField("ID", user.id, true)
            .addField("Mention", user, true);
            
    gatelogChannel.send("", embed);
});*/

client.on("userUpdate", (oldUser, newUser) => {
    if (
        ![...guilds.nos.members.values()].map(member => member.user).includes(newUser)
        || oldUser.tag === newUser.tag
    ) {
        return;
    }

    const embed = new Discord.RichEmbed()
            .setColor(7506394)
            .setTitle(`🔀 User name change — **${Discord.escapeMarkdown(oldUser.username)}**#${oldUser.discriminator} (${newUser.id})`)
            
            .addField("Old DiscordTag", `**${Discord.escapeMarkdown(oldUser.username)}**#${oldUser.discriminator}`, true)
            .addField("➡", "➡", true)
            .addField("New DiscordTag", `**${Discord.escapeMarkdown(newUser.username)}**#${newUser.discriminator}`, true)
            
            .addField("Mention", newUser)
            
            .setFooter(`Message sent ${formatDate(Date.now())}`);
            
    gatelogChannel.send("", embed);
});

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(date) {
    if (typeof date === "number") date = new Date(date);

    return `${weekdays[date.getDay()]}, ${date.getFullYear()} ${months[date.getMonth()]} ${date.getDate()}, ${date.toLocaleTimeString()} EST`;
}

function formatTimeElapsed(date0, date1=Date.now()) {
    let diffRemainder = (date1 - date0) / 1000;

    let string = "";

    const days = floorDivide(86400);
    const hours = floorDivide(3600);
    const minutes = floorDivide(60);

    const seconds = Math.floor(diffRemainder);

    string += `${padWithZeroes(days)}d : ${padWithZeroes(hours)}h : ${padWithZeroes(minutes)}m : ${padWithZeroes(seconds)}s`;

    return string;

    function floorDivide(divisor) {
        const amount = Math.floor(diffRemainder / divisor);
        diffRemainder -= amount * divisor;
        return amount;
    }

    function padWithZeroes(n) {
        return n.toString().padStart(2, "0");
    }
}