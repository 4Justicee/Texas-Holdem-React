const dotenv = require("dotenv");
dotenv.config();

module.exports = {
    port: process.env.PORT || 9999,

    database: {
        type: process.env.DB_TYPE,
        host: process.env.DB_HOST,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        port: parseInt(process.env.DB_PORT),
        pass: process.env.DB_PASS,
    },

    token: process.env.token,
    gameHost : process.env.GAME_HOST || "http://127.0.0.1:9996",
    assetHost : process.env.ASSET_HOST || "http://127.0.0.1:5015",
};
