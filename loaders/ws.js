const WebSocket = require('ws');
const { Sequelize, Op } = require('sequelize');  
const { Upcoming, Inplay, League, Team, Ended, PrematchOdds, InplayOdds, User, FavGames } = require("../models");
const isEmpty = require("../utils/isEmpty")

const calcLiveTime = (inputTimeString) => {
  const year = parseInt(inputTimeString.substring(0, 4), 10);  
  const month = parseInt(inputTimeString.substring(4, 6), 10) - 1; // Subtract 1 because months are 0-indexed  
  const day = parseInt(inputTimeString.substring(6, 8), 10);  
  const hour = parseInt(inputTimeString.substring(8, 10), 10);  
  const minute = parseInt(inputTimeString.substring(10, 12), 10);  
  const second = parseInt(inputTimeString.substring(12, 14), 10);  

  const inputEpochMilli = Date.UTC(year, month, day, hour, minute, second);  
  const inputEpochSeconds = Math.floor(inputEpochMilli / 1000);  

  // Get the current time in epoch seconds  
  // Note: To ensure consistency, convert the current date to UTC as well  
  const now = new Date(); // This represents the current time in local time zone  
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());  
  const nowEpochSeconds = Math.floor(nowUtc / 1000);  

  // Calculate the difference in seconds  
  const differenceInSeconds = nowEpochSeconds - inputEpochSeconds;  

  return differenceInSeconds;
}
const analSoccerInplayResponse = (obj) => {
  let f = [];
  const result = [];
  const scores = [];
  const names = {};
  let nas = [];
  let idx = 0;
  const d = obj;
  let name = "";
  let header = "";
  let passed_second = 0;
  for(let i = 0; i < d.length; i++) {
      if(d[i].type == "EV") {
        if(d[i].TT == "1") {
          passed_second = calcLiveTime(d[i].TU) + (Number)(d[i].TM) * 60 + (Number)(d[i].TS);
        }
        else {
          passed_second = (Number)(d[i].TM * 60) + (Number)(d[i].TS);
        }

      }
      if(d[i].type == 'SC') {
        if(d[i].NA == "") {
          names.name1 = d[i+1].D1;
          names.name2 = d[i+2].D2;
        }
        else {
          scores.push({
            name: d[i].NA,
            score1: d[i+1].D1,
            score2: d[i+2].D1,
            score1_1: d[i+1].D2,
            score2_1: d[i+2].D2,
          })
        }
      }
      if(d[i].type == "MG") {
          if(f.length) {
              result.push({
                  name,
                  odds: f
              })
          }
          f = [];
          nas = [];
          name = d[i].NA;
          continue;
      } 
      if(d[i].type == "MA") {
          header = d[i].NA;
          idx = 0;
      }
      if(d[i].type == "PA") {
          if(d[i].OD == undefined) {
              header = d[i].NA;
              nas.push(header);
              continue;
          }
          let subname = (d[i].NA == undefined || d[i].NA.trim() == "") ? d[i].HA : d[i].NA;
          subname = (subname?.trim() == "") ? d[i].HD : subname;
          subname = (subname == undefined) ? nas[idx++] : subname;
          const ods = d[i].OD.split("\/");
          const odd = (Number)(ods[0]) / (Number)(ods[1]);
          f.push({
              odds: (1+odd).toFixed(3),
              name : subname,
              header,
          });
      }
  }
  result.push({
      name,
      odds: f
  })
  
  return {
    odd:result,
    current_score: scores,
    names,
    passed_second
  };
}


const sendLiveEvent = async(ws) => {
  const info = ws.live_info;
  let sid = 1;  //if not defined, we have to send soccer data 
  try {
    if(info != undefined) {
      sid = info.sid;
      if(info.need == 0) {
        return; 
      }
    }

    if(ws.userCode == undefined) {
      const u = await User.findOne({token:ws.token});
      ws.userCode = u.userCode;
    }

    const now = Date.now();
    const data = await Inplay.findAll({
      include: [
        {
            model: InplayOdds,
            attributes: ["data"],            
        },
      ],
      where:{
        sport_id: sid
      },
      raw:true
    });

    for(let i = 0; i < data.length; i++) {
      const element = data[i];
      try {
        const fav = await FavGames.findAll({where:{matchId: element.id, userCode: ws.userCode}});
        const o = analSoccerInplayResponse(JSON.parse(element["inplayodd.data"]));
        element.is_fav = isEmpty(fav) ?  0 : 1;
        element.data = o.odd;
        element.scores = o.current_score;
        element.names = o.names;
        element.passed_second = o.passed_second;
      }catch(e) {
        element.data = {};
      }
      delete element["inplayodd.data"];

    }

    ws.send(JSON.stringify({
      type: "live",
      data
    }))
  }
  catch(e) {
    console.log(e);
  }

}

const sendPrematchEvent = async(ws) => {
  const info = ws.prematch_info;
  let sid = 1;  //if not defined, we have to send soccer data
  try {
    if(info != undefined) {
      sid = info.sid;
      if(info.need == 0) {
        return;
      }
    }
    const now = Date.now() / 1000;

    const data = await Upcoming.findAll({
      include: [
        {
            model: PrematchOdds,
            attributes: ["data"],            
        },
      ],
      where:{
        sport_id: sid,
        time: {
          [Op.gt]: now
        }
      },
      limit: 10, // Limit to 30 records  
      raw:true
    });
    data.forEach(element => {
      const obj = element['prematchOdd.data'];
      try {
        element.data = JSON.parse(obj);
      }catch(e) {
        element.data = {};
      }

      delete element["prematchOdd.data"];
    });
    ws.send(JSON.stringify({
      type: "prematch",
      data
    }))
  }
  catch(e) {
    console.log(e);
  }
}

module.exports = async () => {
    try {
        const wss = new WebSocket.Server({ port: 9990 });

        wss.on('connection', (ws) => {
            console.log('New client connected!');

            setInterval(async ()=>{
              await sendLiveEvent(ws);
            }, 2000);

            setInterval(async ()=>{
              await sendPrematchEvent(ws);
            }, 5000);

            // Handle messages received from the client
            ws.on('message', (message) => {
                           
              const o = JSON.parse(message);
              if(o.type == 'token') {                
                ws.token = o.token;
              }

              if(o.type == 'live') {
                ws.live_info = {
                  sid: o.sid,                 
                }
                if(o.allow != "both") {
                  ws.prematch_info.need = 0;
                }
              }
              if(o.type == 'prematch') {
                ws.prematch_info = {
                  sid: o.sid,                 
                }
                if(o.allow != "both") {
                  ws.live_info.need = 0;
                }
              }
            });
          
            // Handle client disconnection
            ws.on('close', () => {
              console.log('Client disconnected');
            });
        });
    } catch (error) {
        console.log(error)
    }
};
