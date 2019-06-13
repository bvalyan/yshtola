const {
  Client,
  RichEmbed
} = require('discord.js');
const client = new Client();
const auth = require('./config.json');
const SQLite = require("better-sqlite3");
var schedule = require('node-schedule');
const sql = new SQLite('./ffdb.sqlite');

var coreVersion = '1.0.0';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(auth.token);

//joined a server
client.on("guildCreate", guild => {
  //Your other stuff like adding to guildArray
  // eslint-disable-next-line no-console
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`${client.guilds.size} servers | Try !help`, {
    type: 'WATCHING'
  });
})

client.once('ready', () => {
  client.user.setActivity(`${client.guilds.size} servers | Try !help`, {
    type: 'WATCHING'
  });

const settingsTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'settings';").get();
const birthdayTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'birthdays';").get();

if (!settingsTable['count(*)']) {
    // If the table isn't there, create it and setup the database correctly.
    sql.prepare("CREATE TABLE settings (guild_id TEXT PRIMARY KEY, autoPromotion INTEGER, levelingEnabled INTEGER, welcome INTEGER);").run();
    // Ensure that the "id" row is always unique and indexed.
    sql.prepare("CREATE UNIQUE INDEX idx_settings_guild_id ON settings (guild_id);").run();
    sql.pragma("synchronous = 1");
    sql.pragma("journal_mode = wal");
  }

  if (!birthdayTable['count(*)']) {
    // If the table isn't there, create it and setup the database correctly.
    sql.prepare("CREATE TABLE birthdays (user_id TEXT PRIMARY KEY, user_name TEXT, guild_id TEXT, birthday_month INTEGER, birthday_day INTEGER);").run();
    // Ensure that the "id" row is always unique and indexed.
    sql.prepare("CREATE UNIQUE INDEX idx_birthdays_user_id ON settings (user_id);").run();
    sql.pragma("synchronous = 1");
    sql.pragma("journal_mode = wal");
  }

  client.setBirthday = sql.prepare("INSERT OR REPLACE INTO birthdays (user_id, user_name, guild_id, birthday_month, birthday_day) VALUES (@user_id, @user_name, @guild_id, @birthday_month, @birthday_day);")
  client.getBirthdays = sql.prepare("SELECT * FROM birthdays WHERE guild_id = ?;");
  client.getAllBirthdays = sql.prepare("SELECT * FROM birthdays;");
  client.getWelcomeStatus = sql.prepare("SELECT welcome FROM  settings WHERE guild_id = ?;");
  client.updateWelcomeStatus = sql.prepare("UPDATE settings SET welcome = ? WHERE guild_id = ?;");

  console.log(`I am online and operational! Core Version: ${coreVersion}.`);
});

client.on('message', message => {

  var messageString = message.content.toLowerCase();
  var pruneMembersRegex = /!prune (\d+)/i;
  var addBirthdayRegex = /!addbirthday (\d+)\/(\d+)/i;
  var setBirthdayTimeRegex = /!setbirthdaytime (\d+)/i;

  if (messageString === '!help') {
      const embed = new RichEmbed()
        // Set the title of the field
        .setTitle('Y\'shtola Functionality')
        // Set the color of the embed
        .setColor(0xFF0000)
        // Set the main content of the embed
        .setDescription('Yes? What is it?')
        .addField('!prune <days inactive>', 'Prune members from the server who have been inactive for the specified amount of days.')
        .addField('!schedulemessage <Message> <Year> <Month> <Day> <Hour> <Minute> <Seconds>', 'Instruct me on a message to send to the channel at a later time. (Requires Admin)[Timezone: EST]')
        .addField('!getBirthdays', 'See all the birthdays I\'ve recorded.')
        .addField('!addbirthday <month/day> (01/25)', 'Add a birthday in number format and I shall announce the day on which you were born.');
      // Send the embed to the same channel as the message
      message.reply(embed);
    }

  if (pruneMembersRegex.test(messageString)) {
      var match = pruneMembersRegex.exec(messageString);
      var daysInactive = match[1];
      pruneGuildMembers(message, daysInactive);
    }

  if (setBirthdayTimeRegex.test(messageString)) {
      var timeMatch = setBirthdayTimeRegex.exec(messageString);
      var hour = timeMatch[1];
      client.setBirthdayShoutOutTime.run(hour, message.guild.id);
      var rule = new schedule.RecurrenceRule();
      rule.hour = hour;
      schedule.scheduleJob(rule, function() {
        checkBirthdays(message);
      });
      message.reply(aiGreeting() + ` I'll announce birthdays at ${hour}:00`);
    }

    if (messageString === `!getbirthdays`) {
      retrieveBirthdays(message);
    }

    if (addBirthdayRegex.test(messageString)) {
      recordBirthday(message, messageString, addBirthdayRegex);
    }
});

////////////////////// functions ///////////////////////////

function pruneGuildMembers(message, daysInactive) {
  // See how many members will be pruned
  if (message.member.hasPermission('ADMINISTRATOR')) {
    var inactiveDays = Number(daysInactive);
    message.guild.pruneMembers(inactiveDays, true)
      .then(pruned => message.reply(`This will prune ${pruned} people from the server for being inactive for ${inactiveDays} days! Continue? (y/n)`))
      .then(() => {
        message.channel.awaitMessages(response => response.author === message.author, {
          max: 1,
          time: 30000,
          errors: ['time'],
        }).then((collected) => {
          var response = collected.first().content;
          if (response === 'y') {
            message.guild.pruneMembers(daysInactive)
              .then(pruned => message.reply(`I just pruned ${pruned} people!`))
              // eslint-disable-next-line no-console
              .catch(console.error);
          } else {
            message.reply(aiGreeting() + ` Cancelling pruning operation.`)
          }
        })
      })
  } else {
    message.reply(aiApology() + ` You do not have clearance to do this.`);
  }
}

function aiApology() {
  var apologyIndex = Math.floor(Math.random() * 4);
  switch (apologyIndex) {
    case 0:
      return `my apologies.`
    case 1:
      return `sorry.`
    case 2:
      return `there's an issue, `
    case 3:
      return `I ran into a problem, `;
    default:
      return '';
  }
}

function aiGreeting() {
  var greetingIndex = Math.floor(Math.random() * 9);
  switch (greetingIndex) {
    case 0:
      return `absolutlely.`;
    case 1:
      return `at once.`;
    case 2:
      return `certainly.`;
    case 3:
      return `yes.`
    case 4:
      return `coming right up.`;
    case 5:
      return `very well.`;
    case 6:
      return `acknowledged.`;
    case 7:
      return `my pleasure.`;
    case 8:
      return `as requested.`;
    case 9:
      return `I'm on it.`;
    default:
      return '';
  }
}

function checkBirthdays(message) {
  const birthdayTodayEmbed = new RichEmbed()
    .setTitle("Today's Birthdays")
    .setDescription("Happy Birthday!");
  var birthdays = client.getBirthdays.all(message.guild.id);
  var today = new Date();
  for (var i = 0; i < birthdays.length; i++) {
    if (birthdays[i].birthday_month - 1 == today.getMonth() && birthdays[i].birthday_day == today.getDate()) {
      birthdayTodayEmbed.addField(`${birthdays[i].user_name}`, ``, false);
    }
  }
  message.channel.send(`@here` + birthdayTodayEmbed);
}

function retrieveBirthdays(message) {
  var birthdays = client.getBirthdays.all(message.guild.id);
  const embed = new RichEmbed()
    .setTitle(`${message.guild.name} Birthdays`)
    .setDescription('Recorded birthdays in this server.');
  if (birthdays.length > 0) {
    for (var i = 0; i < birthdays.length; i++) {
      embed.addField(`${birthdays[i].user_name}`, `${birthdays[i].birthday_month}/${birthdays[i].birthday_day}`, false);
    }
  } else {
    message.reply(aiApology() + ` No birthdays have been recorded yet!`);
  }
  message.reply(embed);
}

function recordBirthday(message, messageString, addBirthdayRegex) {
  var birthdayMatch = addBirthdayRegex.exec(messageString);
  var month = birthdayMatch[1];
  var year = birthdayMatch[2];

  var birthdayObj = {
    user_id: message.author.id,
    user_name: message.author.username,
    guild_id: message.guild.id,
    birthday_month: month,
    birthday_day: year
  }
  client.setBirthday.run(birthdayObj);
  message.reply(`Recorded! Can't wait until your special day!`);
}
