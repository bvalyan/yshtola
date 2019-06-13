const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./config.json');
const SQLite = require("better-sqlite3");
const sql = new SQLite('./ffdb.sqlite');

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(auth.token);
