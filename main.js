const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'))
const scheduler = require('node-schedule');

var date = new Date();
date.getTime();

const mysql = require('mysql');
const { SSL_OP_NETSCAPE_CA_DN_BUG } = require('constants');
const connection = mysql.createConnection({
    host     : 'ip goes here',
    port     : 'port goes here',
    user     : 'database user (prefix db.) goes here',
    password : config.password,
    database : 'database name (prefix db.) goes here',
    charset  : 'utf8mb4'
})

connection.connect(error => {
    if(error) throw error;
    console.log("Connected to Database!");
    connection.query("SHOW TABLES", console.log);
})

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setStatus('dnd');
})

client.on('message', (msg) => {

    var content = msg.content,
        author = msg.member,
        channel = msg.channel,
        guild = msg.guild

    if (channel.type != "dm" && author.id != client.user.id && content.startsWith(config.prefix)){
        var invoke = content.split(' ')[0].substring(config.prefix.length),
            args = content.split(' ').slice(1)

        if (invoke in cmdmap){
            cmdmap[invoke](msg, args);
        }
    }
})

var cmdmap = {
    help: cmd_help,
    list: cmd_list,
    check: cmd_check,
    next: cmd_next
}

function cmd_help(msg, args){
    const helpEmbed = new Discord.MessageEmbed()
    .setColor('#141414')
    .setTitle('Bot Overview')
    .setDescription('Im the Birthday Bot! I will announce everybodys Birthday!')
    .addFields(
        { name: 'Developed by:', value: 'Sakros' }
    )
    .setTimestamp();

    msg.channel.send(helpEmbed);
}

function cmd_list(msg, args){
    connection.query(`SELECT * FROM birthdays`, function(error, result){
        if(error) throw error;

        const listEmbed = new Discord.MessageEmbed()
        .setColor('9145e7')
        .setTitle('Birthdays')
        .setDescription("A list of all birthdays. Register your own birthday with `!bdayadd <day.month.year>` example: `!bdayadd 16.06.2001`")
        .addField("`___________________________________`", "⠀")
        .setFooter("Created by Sakros.")
        .setTimestamp();

        var server = client.guilds.cache.get("275944220194242560");

        var promise = new Promise((resolve, reject) => {
            var count = 0;
            result.forEach(element => {
                server.members.fetch(element.uuid).then(_member => {
                    listEmbed.addField(_member.user.username, "`" + element.day + "." + element.month + "." + element.year + "`", true);
                    count++;
                    if(count == result.length) resolve();
                }).catch(console.error);
            });
        })

        promise.then(() => {
            console.log(listEmbed);
            listEmbed.addField("`___________________________________`", "⠀");
            msg.channel.send(listEmbed).then(_message => {
                //_message.react('◀️');
                //_message.react('▶️');
                _message.react('❌');
                const filter = (reaction, user) => reaction.emoji.name === '❌' && user.id != '739558742286401679';
                _message.awaitReactions(filter, { max: 1 }).then( collected => {
                    console.log("triggered");
                    _message.delete();
                }).catch(
                    console.error
                );
            });
        });
    })
}

function cmd_check(msg, args){
}

function cmd_next(msg, args) {
    connection.query(`SELECT * FROM birthdays`, function(error, result){
        if(error) throw error;
        const oneDay = 24 * 60 * 60 * 1000;
        var today = new Date();
        var bdays = [];

        var promise = new Promise((resolve, reject) => {
            var count = 0;
            result.forEach(element => {
                var bday = new Date(today.getFullYear() + 1, element.month-1, element.day);
                const first = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
                const second = Date.UTC(bday.getFullYear(), bday.getMonth(), bday.getDate());
                var diffDays = new Date(second - first);
                var days = diffDays/1000/60/60/24;
                if (days > 365) days -= 365;

                var server = client.guilds.cache.get("275944220194242560");
                server.members.fetch(element.uuid).then(_member => {
                    bdays.push("`" + _member.user.username + "` has birthday in `" + days + " Days`.");
                    count++;
                    if(count == result.length) resolve();
                }).catch(console.error);
            });
        })

        const nextEmbed = new Discord.MessageEmbed()
        .setColor('9145e7')
        .setTitle('Birthdays')
        .setDescription('A list with all upcoming birthdays:')
        .setFooter("Created by Sakros.")
        .setTimestamp();

        promise.then(() => { 
            bdays.forEach(function(element) {
                nextEmbed.setDescription(nextEmbed.description + "\n\n" + element);
            });
            
            msg.channel.send(nextEmbed);
        });
    });
}

scheduler.scheduleJob('0 0 * * *', () => {
    connection.query(`SELECT * FROM birthdays`, function(error, result){
        if(error) throw error;
        var someoneHasBirthday = false;
        var today = new Date();

        result.forEach(element => {
            var bday = new Date(element.year, element.month-1, element.day);
            if(today.getDate() == bday.getDate()){
                if(today.getMonth() == bday.getMonth()){
                    var server = client.guilds.cache.get("275944220194242560");
                    var channel = client.channels.cache.get("739824117683060766");
                    var user = client.users.cache.get(element.uuid);
                    var member = server.members.cache.get(element.uuid);

                    var bdayEmbed = new Discord.MessageEmbed()
                    .setColor('9145e7')
                    .setTitle('Happy Birthday! 💥')
                    .setDescription("Heute ist dein Geburtstag. Feiere ihn auch im Sakros-Discord mit der Geburtstagsrolle!")
                    .setFooter("Created by Sakros.")
                    .setTimestamp();

                    user.send(bdayEmbed);
                    var role = server.roles.cache.get("647436737836220446");
                    member.roles.add(role);

                    someoneHasBirthday = true;
                    channel.send("Heute hat jemand Geburtstag! Und zwar: " + "<@" + element.uuid + ">");
                }
            }
        });
        if(!someoneHasBirthday) {
            //channel.send("Heute hat niemand Geburtstag.");
        }
    });
})

client.login(config.token);