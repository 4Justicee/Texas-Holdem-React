const axios = require("axios");
const config = require("../config/main")
const fs = require('fs')
const moment = require("moment");

const { Upcoming, Inplay, League, Team, Ended, PrematchOdds, InplayOdds, sequelize } = require("../models");

// team stopped 2, 400
const sportIds = [1, 13, 78, 2, 17, 12, 83, 92, 8, 36, 9, 90, 110, 151, 148, 18, 91, 16, 4, 14, 3, 15, 94, 19, 66, 75, 95, 107, 162];
const names={
    1:"Soccer", 
    13:"Tennis",
    78:"Handball",
    2: "Horse Racing",
    17:"Ice Hockey",
    12:"American footbal",
    83: "Futsal",
    92: "Table Tennis",
    8: "Rugby Union",
    36: "Australian Rules",
    9 :"Boxing",
    90: "Floorball",
    110: "Water Polo",
    151: "E-Sports",
    148: "Surfing",
    18:"Basketball",
    91:"Volleyball",
    16:"Baseball",
    4: "Greyhounds",
    14:"Snooker",
    3:"Cricket",
    15:"Darts",
    94:"Badminton",
    19: "Rugby League",
    66:"Bowls",
    75:"Gaelic Sports",
    95:"Beach Volleyball",
    107: "Squash",
    162: "MMA"
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const upcomingEvent = async ()=>{
    const transaction = await sequelize.transaction();
    const existingRecords = await Upcoming.findAll({ transaction });
    const existingMap = new Map(existingRecords.map(record => [record.id, record]));
       

    for(let j = 0; j < sportIds.length; j++) {
        const sid = sportIds[j];
        let page = 1;

        const getOneSportData = async (day) => {
            const url = (sid == 151) ? `https://api.b365api.com/v1/bet365/upcoming?sport_id=${sid}&token=${config.token}&day=${day}&page=${page}` : 
            `https://api.b365api.com/v1/bet365/upcoming?sport_id=${sid}&token=${config.token}&day=${day}&skip_esports=true&page=${page}`;  

            const response = await axios.get(url);
            const total = response.data.pager.total;
            const d = response.data.results;
            console.log(`Processing upcoming, sportId: ${sid}, day:${day}, total:${total}, page:${page}`);

            await updatePrematchTransaction(d, transaction, existingMap);

            if(page * 50 < total) {
                page++;                
                await getOneSportData(day)                
            }                                              
            
        }

        for(k = 0; k < 3; k++) {
            page = 1;       
            let day = moment(new Date()).add(k, "days").format("YYYYMMDD");
            await getOneSportData(day);
        }
    }

    await Promise.all(Array.from(existingMap.values()).map(record => record.destroy({ transaction })));
    await transaction.commit();

    Array.from(existingMap.values()).map(record=>{
        PrematchOdds.destroy({
            where: {
                FI: record.id
            }
        })
    });

    console.log(`Read upcoming data finished.`);
}

const endedEvent = async ()=>{
    console.log('endedEvent called every 1 Day');   
       
    for(let j = 0; j < sportIds.length; j++) {
        const sid = sportIds[j];
        let page = 1;

        const getOneSportData = async (day) => {
            const url = (sid == 151) ? `https://api.b365api.com/v3/events/ended?sport_id=${sid}&token=${config.token}&day=${day}&page=${page}` : 
            `https://api.b365api.com/v3/events/ended?sport_id=${sid}&token=${config.token}&day=${day}&skip_esports=true&page=${page}`;  

            const response = await axios.get(url);
            const total = response.data.pager.total;
            const d = response.data.results;
            console.log(`Processing, sportId: ${sid}, day:${day}, total:${total}, page:${page}`);
            for(let i = 0; i < d.length; i++) {
                const league = d[i].league;
                const home = d[i].home;
                const away = d[i].away;
                const date = new Date(d[i].time * 1000); // Multiply by 1000 to convert seconds to mil
                const time_str = date.toISOString(); 
                await Ended.findOrCreate(
                    {
                        where:{id: d[i].id},
                        defaults: {
                            sport_id: d[i].sport_id,
                            time: d[i].time,
                            time_str,
                            time_status: d[i].time_status,
                            league_id: league?.id,
                            league_name: league?.name,
                            league_cc: league?.cc,
                            home_id: home?.id,
                            home_name: home?.name,
                            home_image_id: home?.image_id,
                            home_cc: home?.cc,
                            away_id: away?.id,
                            away_name: away?.name,
                            away_image_id: away?.image_id,
                            away_cc: away?.cc,
                            ss: d[i].ss,
                            scores: JSON.stringify(d[i].scores),
                            stats: JSON.stringify(d[i].stats),
                        }
                    }
               )
            }
            
            if(page * 50 < total) {
                page++;                
                await getOneSportData(day)                
            }
            
        }

        for(k = 0; k < 2; k++) {
            page = 1;       
            let day = moment(new Date()).subtract(k, "days").format("YYYYMMDD");
            await getOneSportData(day);
        }
        console.log(`Finished Ended data read: ${sid}`);
    }
    console.log(`Read Ended data finished.`);
}

const getLeagues = async() => {
    for(let j = 0; j < sportIds.length; j++) {
        const sid = sportIds[j];
        let page = 1;

        const getLeaguePageData = async () => {
            const url = `https://api.b365api.com/v1/league?sport_id=${sid}&token=${config.token}&page=${page}`;  

            const response = await axios.get(url);
            const total = response.data.pager.total;
            const d = response.data.results;
            console.log(`Processing, sportId: ${sid}, total:${total}, page:${page}`);
            for(let i = 0; i < d.length; i++) {
                await League.findOrCreate(
                    {
                        where:{id: d[i].id},
                        defaults: {
                            sport_id: sid,
                            name: d[i].name,
                            cc: d[i].cc,
                            has_leaguetable: d[i].has_leaguetable,
                            has_toplist: d[i].has_toplist,
                        }
                    }
               )
            }
            
            if(page * 100 < total) {
                page++;                
                setTimeout(getLeaguePageData, 300);
            }
            
        }

        await getLeaguePageData();
        
        //console.log(`Finished League data read: ${sid}`);
    }
    console.log(`Read League data finished.`);
}

const getTeams = async() => {
    for(let j = 0; j < sportIds.length; j++) {
        const sid = sportIds[j];
        let page = 1;

        const getTeamPageData = async () => {
            const url = `https://api.b365api.com/v1/team?sport_id=${sid}&token=${config.token}&page=${page}`;  

            const response = await axios.get(url);
            const total = response.data.pager.total;
            const d = response.data.results;
            console.log(`Processing, sportId: ${sid}, total:${total}, page:${page}`);
            for(let i = 0; i < d.length; i++) {
                await Team.upsert(
                    {
                        id: d[i].id,                        
                        sport_id: sid,
                        name: d[i].name,
                        cc: d[i].cc,
                        image_id: d[i].image_id,
                        has_squad: d[i].has_squad,                        
                    }
               )
            }
            
            if(page * 100 < total) {
                page++;                
                await getTeamPageData();
            }
            
        }

        await getTeamPageData();
        
        //console.log(`Finished League data read: ${sid}`);
    }
    console.log(`Read Team data finished.`);
}

const fetchInplayOdd = (event_id) => {
    const url = `https://api.b365api.com/v1/bet365/event?token=${config.token}&FI=${event_id}`;  
    axios.get(url).then(response=>{
        const data = response.data.results[0];
        InplayOdds.upsert(
            {
                id: event_id,
                FI: event_id,
                data : JSON.stringify(data),                
            }
        )
    });      
   
}

const fetchPrematchOdds = async (event_id) => {
    const url = `https://api.b365api.com/v3/bet365/prematch?token=${config.token}&FI=${event_id}`;  
    const response = await axios.get(url)
        const data = response.data.results[0];
        
        PrematchOdds.upsert(
            {
                id: event_id,
                FI: data.FI,
                data : JSON.stringify(data),
                
            }
        )
//    });   
    
}

const inplayEvent = async ()=> {
    const transaction = await sequelize.transaction();
    const existingRecords = await Inplay.findAll({ transaction });
    const existingMap = new Map(existingRecords.map(record => [record.id, record]));

    for(let j = 0; j < sportIds.length; j++) {
        const sid = sportIds[j];
        let page = 1;

        const getInplayPageData = async () => {
            const url = `https://api.b365api.com/v1/bet365/inplay_filter?sport_id=${sid}&token=${config.token}`;  

            const response = await axios.get(url);
            const total = response.data.pager.total;
            const d = response.data.results;
            console.log(`Processing Inplay, sportId: ${sid}, total:${total}, page:${page}`);

            await updateInplayTransaction(d, transaction, existingMap);
            
            if(page * 100 < total) {
                page++;                
                await getInplayPageData();
            }                               
        }
        await getInplayPageData();        
    }

    await Promise.all(Array.from(existingMap.values()).map(record => record.destroy({ transaction })));
    await transaction.commit();

    Array.from(existingMap.values()).map(record=>{
        InplayOdds.destroy({
            where: {
                id: record.id
            }
        })
    });

    console.log(`Read Inplay data finished.`);
}

const inplayFilterEvent = ()=> {
    console.log('inplayFilterEvent called every 5 second');
}

const loadUpcomingFromFile = async ()=>{
    const data = fs.readFileSync("upcoming.json", "utf8");
    const obj = JSON.parse(data);
    const d = obj.results;
    for(let i = 0; i < d.length; i++) {
        const league = d[i].league;
        const home = d[i].home;
        const away = d[i].away;
        await Upcoming.create({
            id: d[i].id,
            sport_id: d[i].sport_id,
            time: d[i].time,
            time_status: d[i].time_status,
            league_id: league.id,
            league_name: league.name,
            league_cc: league.cc,
            home_id: home.id,
            home_name: home.name,
            home_image_id: home.image_id,
            home_cc: home.cc,
            away_id: away.id,
            away_name: away.name,
            away_image_id: away.image_id,
            away_cc: away.cc,
            ss: d[i].ss,
            bet365_id: d[i].bet365_id
        })
    }
}

const loadInplayFromFile = async ()=>{
    const data = fs.readFileSync("inplay.json", "utf8");
    const obj = JSON.parse(data);
    const d = obj.results;
    for(let i = 0; i < d.length; i++) {
        const league = d[i].league;
        const home = d[i].home;
        const away = d[i].away;
        await Inplay.create({
            id: d[i].id,
            sport_id: d[i].sport_id,
            time: d[i].time,
            time_status: d[i].time_status,
            league_id: league.id,
            league_name: league.name,
            league_cc: league.cc,
            home_id: home.id,
            home_name: home.name,
            home_image_id: home.image_id,
            home_cc: home.cc,
            away_id: away.id,
            away_name: away.name,
            away_image_id: away.image_id,
            away_cc: away.cc,
            ss: d[i].ss,
            scores: JSON.stringify(d[i].scores),
            stats: JSON.stringify(d[i].stats),
            bet365_id: d[i].bet365_id,
            timer: JSON.stringify(d[i].timer)
        })
    }
}



async function updateInplayTransaction(newData, transaction, existingMap) {
    try {
        // Start a new transaction        
        try {        
            // Arrays for storing records that need to be created or updated
            const recordsToUpdate = [];
            const recordsToCreate = [];

            for (const newItem of newData) {
                const existingItem = existingMap.get((Number)(newItem.id));
                
                fetchInplayOdd(newItem.id);

                if (existingItem) {
                    // Check for changes
                    const hasChanges = existingItem.ss !== newItem.ss || existingItem.updated_at !== newItem.updated_at || existingItem.time_status !== newItem.time_status;

                    if (hasChanges) {
                        // Update existing fields
                        existingItem.ss = newItem.ss;
                        existingItem.time_status = newItem.time_status;
                        existingItem.updated_at = newItem.updated_at;
                        existingItem.updated = 1;

                        recordsToUpdate.push(existingItem);
                    }                   
                    // Remove the processed item from the map
                    existingMap.delete((Number)(newItem.id));
                } else {
                    // Create new items
                    const league = newItem.league;
                    const home = newItem.home;
                    const away = newItem.away;
                    const date = new Date(newItem.time * 1000); // Multiply by 1000 to convert seconds to mil
                    const time_str = date.toISOString(); 
                    
                    recordsToCreate.push({
                        id: newItem.id,
                        sport_id: newItem.sport_id,
                        time: newItem.time,
                        time_str,
                        time_status: newItem.time_status,
                        league_id: league?.id,
                        league_name: league?.name,
                        league_cc: league?.cc,
                        home_id: home?.id,
                        home_name: home?.name,
                        home_image_id: home?.image_id,
                        home_cc: home?.cc,
                        away_id: away?.id,
                        away_name: away?.name,
                        away_image_id: away?.image_id,
                        away_cc: away?.cc,
                        ss: newItem.ss,
                        our_event_id: newItem.our_event_id,
                        r_id: newItem.r_id,
                        ev_id: newItem.ev_id,
                        updated: 1,
                        updated_at:newItem.updated_at
                    });
                }
            }

            // Insert new records in bulk
            if (recordsToCreate.length > 0) {
                await Inplay.bulkCreate(recordsToCreate, { transaction });
            }
            // Update existing records
            await Promise.all(recordsToUpdate.map(record => record.save({ transaction })));
            
        }catch(e) {
            await transaction.rollback();
            console.error('Transaction failed, changes rolled back:', error);
        };

    } catch (error) {
        console.error('Failed to update database:', error);
    }
}

async function updatePrematchTransaction(newData, transaction, existingMap) {
    try {
        // Start a new transaction        
        try {        
            // Arrays for storing records that need to be created or updated
            const recordsToUpdate = [];
            const recordsToCreate = [];

            for (const newItem of newData) {
                const existingItem = existingMap.get((Number)(newItem.id));
                
                if (existingItem) {
                    // Check for changes
                    const hasChanges = existingItem.ss !== newItem.ss || existingItem.time_status !== newItem.time_status;

                    if (hasChanges) {
                        // Update existing fields
                        existingItem.ss = newItem.ss;
                        existingItem.time_status = newItem.time_status;
                        existingItem.updated = 1;

                        recordsToUpdate.push(existingItem);
                    }                   
                    // Remove the processed item from the map
                    existingMap.delete((Number)(newItem.id));
                } else {
                    // Create new items
                    const league = newItem.league;
                    const home = newItem.home;
                    const away = newItem.away;
                    const date = new Date(newItem.time * 1000); // Multiply by 1000 to convert seconds to mil
                    const time_str = date.toISOString(); 
                    
                    recordsToCreate.push({
                        id: newItem.id,
                        sport_id: newItem.sport_id,
                        time: newItem.time,
                        time_str,
                        time_status: newItem.time_status,
                        league_id: league?.id,
                        league_name: league?.name,
                        league_cc: league?.cc,
                        home_id: home?.id,
                        home_name: home?.name,
                        home_image_id: home?.image_id,
                        home_cc: home?.cc,
                        away_id: away?.id,
                        away_name: away?.name,
                        away_image_id: away?.image_id,
                        away_cc: away?.cc,
                        ss: newItem.ss,
                        bet365_id: newItem.bet365_id,
                        updated: 1,
                    });
                }
            }

            // Insert new records in bulk
            if (recordsToCreate.length > 0) {
                await Upcoming.bulkCreate(recordsToCreate, { transaction });
            }
            // Update existing records
            await Promise.all(recordsToUpdate.map(record => record.save({ transaction })));
            
        }catch(e) {
            await transaction.rollback();
            console.error('Transaction failed, changes rolled back:', error);
        };

    } catch (error) {
        console.error('Failed to update database:', error);
    }
}

const fetchUpcomingOdd = async () => {    
    //const transaction = await sequelize.transaction();

    //await sequelize.query('LOCK TABLES upcomings WRITE', { transaction });
    const u = await Upcoming.findAll({order:[['id','asc']], raw:true});
    //await sequelize.query('UNLOCK TABLES', { transaction });

    for(let i = 0; i < u.length; i++) {
        console.log(`${i}/${u.length}`);
        await fetchPrematchOdds(u[i].id);
    }
}

const fetchResult = async () => { //this is called every 2 second to calc 
    const res = await Inplay.findAll();
    for(let i = 0; i < res.length; i+= 10) {
        const a = [];
        a[0] = res[i].id;
        a[1] = res[i+1].id;
        a[2] = res[i+2].id;
        a[3] = res[i+3].id;
        a[4] = res[i+4].id;
        a[5] = res[i+5].id;
        a[6] = res[i+6].id;
        a[7] = res[i+7].id;
        a[8] = res[i+8].id;
        a[9] = res[i+9].id;
        const vv = a.join();
        const url = `https://api.b365api.com/v1/bet365/result?token=${config.token}&event_id=${vv}`;  
        const response = await axios.get(url);
        const data = JSON.stringify(response.data.results);
        fs.appendFileSync("result.json",data);
    }    
    console.log(`finished`);
    
}

module.exports = async () => {
    try {
        //await upcomingEvent(); //it can call 1 day. but odds have to call 5min.
        //await inplayEvent(); //finished. can call 5~10 second. odds updated too. 
        //await endedEvent();
        //await upcomingEvent();
        //await getTeams();
        //await fetchResult();
        //await fetchUpcomingOdd();

        /*setInterval(upcomingEvent, 3600 * 24 * 1000);
        setInterval(prematchEvent, 2000);
        setInterval(resultEvent, 3000);
        setInterval(inplayEvent, 4000);
        setInterval(inplayFilterEvent, 5000);*/
        //await loadUpcomingFromFile();
        //await loadInplayFromFile();
        let bbb = 0;
    } catch (error) {
        console.log(error)
    }
};
