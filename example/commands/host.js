/**
  KustomBot - A customizable bot for Twitch.
  Copyright (C) 2019  Sighmir

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Config for host raffle
let raffleInterval = 1000 * 60 * 15 // Raffle interval 1000ms * 60s * 15m = 15 minutes
let raffleAnnounce = true           // If announcements on chat should be on
let maxTicket = 100                 // Max number a ticket can have
let streamMe = true                 // If you want to stream yourself in between raffles
// End of config

let mainChannel = `#${bot.account}`
let hostCooldown = false
let hostTickets = {}

function ordinalSuffix(i) {
  let j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

let hostAnnounce = async () => {
  if (raffleAnnounce) {
    setTimeout(() => {
      bot.say(mainChannel, `The next host raffle happens in 5 minutes, type !hostme to join!`)
    }, raffleInterval - 1000 * 60 * 5)
    setTimeout(() => {
      bot.say(mainChannel, `The next host raffle happens in 10 minutes, type !hostme to join!`)
    }, raffleInterval - 1000 * 60 * 10)
  }
}

let hostWinner = async () => {
  let num = Math.floor(Math.random() * Math.floor(maxTicket))
  let winner = { dist: maxTicket }
  for (let host in hostTickets) {
    if (num - hostTickets[host] < winner.dist) {
      winner.username = host
      winner.dist = Math.abs(num - hostTickets[host])
      winner.num = hostTickets[host]
      if (winner.dist == 0) break
    }
  }
  if (winner.username) {
    let stream = await helix.getStreams({ user_login: winner.username })
    if (stream.data.length) {
      hostTickets = {}
      bot.say(mainChannel, `The number is ${num}! ${winner.username} is the winner of the raffle!`)
      if (winner.username == bot.account) {
        bot.say(mainChannel, `/unhost`)
      } else {
        bot.say(mainChannel, `/host ${winner.username}`)
      }
      hostCooldown = winner.username
    } else {
      delete hostTickets[winner.username]
      bot.say(mainChannel, `The number is ${num}! ${winner.username} is the winner of the raffle, but his stream is offline!`)
      bot.say(mainChannel, `We will pick another winner!`)
      hostWinner()
    }
  }
}

let hostRaffle = async () => {
  let stream = await helix.getStreams({ user_login: bot.account })
  if (streamMe && stream.data.length > 0) {
    if (hostCooldown) {
      hostCooldown = false
      bot.say(mainChannel, `${bot.account} is going back on stream!`)
      bot.say(mainChannel, `/unhost`)
      hostAnnounce()
    } else {
      hostWinner()
    }
  } else {
    hostWinner()
    hostAnnounce()
  }
  setTimeout(hostRaffle, raffleInterval)
}
hostRaffle()

bot.addCommandHandler('hostme', async (channel, data, args) => {
  if (channel == mainChannel) {
    if (data.username != hostCooldown) {
      let stream = await helix.getStreams({user_login: data.username})
      if (stream.data.length > 0) {
        let num = Number(args[0])
        if (Number.isNaN(num)) num = Math.floor(Math.random() * Math.floor(maxTicket))
        if (hostTickets[data.username] == null) {
          if (num <= maxTicket && num >= 0) {
            hostTickets[data.username] = num
            bot.say(channel, `${data.username} is the ${ordinalSuffix(Object.keys(hostTickets).length)} to join the raffle with number ${num}!`)
          } else {
            bot.say(channel, `${data.username} your ticket number must be between 0 and ${maxTicket}!`)
          }
        } else {
          bot.say(channel, `${data.username} you already have a ticket for this raffle!`)
        }
      } else {
        bot.say(channel, `${data.username} your stream must be live to join the raffle!`)
      }
    } else {
      bot.say(channel, `${data.username} you're already being hosted!`)
    }
  }
})
