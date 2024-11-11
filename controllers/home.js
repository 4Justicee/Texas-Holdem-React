const { Agent, User, Game, Op } = require("../models");
const axios = require("axios");
const md5 = require('md5');

const config = require("../config/main")

const requestTo = async (comment, type, url, data = {}) => {
    try {        

        const instance = axios.create({
            timeout: 1000 * 6,
        });

        let response;

        if (type.toUpperCase() == "GET") {
            response = await instance.get(url, { params: data });
        } else if (type.toUpperCase() == "POST") {           
            response = await instance.post(url, data );
        }

          
        return response.data;

    } catch (error) {
        console.log(error);

        return {};
    }
};

exports.gameService = async (req, res) => {
    try {
        const {operator: gameCode} = req.query;
        const {game: gameName, customVars:token, action} = JSON.parse(req.body.data);

        const { success, data } = await checkPlayGame(req, res);
        
        if (!success) {
            return errorHandle(res, msg);
        }

        const { game  } = data;

        switch(action) 
        {
            case 'init':
                return await initHandle(req, res, { game });
                break;
            case 'settings':
                return await settingHandle(req, res, { game });
                break;
        }                     
        
    } catch (error) {
        console.log(error.stack);        

        return res.json({
            status: 0,
            msg: ERR_MSG.INTERNAL_ERROR,
        });
    }
};


async function initHandle(req, res, { game }) {
    try {
        const reqObj = req.body;

        const initPattern = game.initPattern;

       

        res.send(initPattern);
    } catch (error) {
        console.log(error);
    }
}

async function settingHandle(req, res, { game }) {
    try {
        const reqObj = req.body;
        const settings = game.settings;
        

       

        res.send(settings);
    } catch (error) {
        console.log(error);
    }
}

const checkPlayGame = async (req, res) => {
    try {
        const {operator: gameCode} = req.query;
        const {game: gameName, customVars:token} = JSON.parse(req.body.data);

        /*const user = await User.findOne({ where: { token } });
        if (!user) {
            return {
                success: false,
                msg: GAME_ERR_MSG.INVALID_TOKEN["en"],
            };
        }
*/
        const game = await Game.findOne({
            where: {
                gameCode,
                status: { [Op.not]: 0 },
                initPattern: { [Op.not]: null },
            },
        });

        return {
            success: true,
            data: { game },
        };
    } catch (error) {
        console.log(error);
        return {
            success:false,
            data: null
        }
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        const {type, tid} = req.body;
      
        FavGames.destroy({
            where:{
                type,
                matchId: tid
            }
        })
        
        return res.json({
            status: 1,
        });

        
    } catch (error) {
        console.log(error.stack);        

        return res.json({
            status: 0,
            msg: ERR_MSG.INTERNAL_ERROR,
        });
    }
};

exports.getGameLaunchUrl = async (req, res) => {
    try {
        const { agentCode, userCode, gameCode, balance, rtp, jackpotCome, isTest, lang, currency: agentCurrency, siteEndPoint } = req.body;
        //                  
        const agent = await Agent.findOne({ where: { code: agentCode } });
        if (!agent) {
            return res.json({
                status: 0,
                msg: "Invalid Agent",
            });
        }

        const user = await User.findOne({ where: { agentCode, userCode } });
       
        let currency = agentCurrency || "USD";
        //             
        let mgckey = md5(agentCode + userCode + gameCode + new Date());

        if (user) {
            await user.update({
                token: mgckey,                
                balance,
                lang,
                currency,
            });
        } else {
            const userData = {
                agentCode,
                userCode,
                token: mgckey,
                balance,
                totalDebit: 0,
                totalCredit: 0,
                lang,
                currency,
            };
            await User.create(userData);
        }

        let gameUrl = encodeURI(`${config.gameHost}/sports?mgckey=${mgckey}&lang=${lang}&from=${siteEndPoint}`);
        

        return res.json({
            status: 1,
            url: gameUrl,
        });
    } catch (error) {
        console.log(error);

        return res.json({
            status: 0,
            msg: SERVER_ERR_MSG.INTERNAL_ERROR,
        });
    }
};

exports.gameMaintenance = async (req, res) => {
    res.render(`503.ejs`);
};

exports.mainPage = async (req, res) => {    
    try {
        const { gameHost, assetHost } = config;
        
        const gameCode = 250;
        const gameName = "videoPoker";
        const token = "1234567890";
        return res.render("index", {
            gameHost,
            assetHost,
            gameCode,
            gameName,
            token
        });
    } catch (error) {
        logger("error", "Game | Run Game", error.message, req);

        return res.render("error/500");
    }

};