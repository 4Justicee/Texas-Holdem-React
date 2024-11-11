const mysql = require("mysql2/promise");
const database = require("../models");
const config  = require("../config/main")
module.exports = async () => {
    try {
        try {
            const conn = await mysql.createConnection({
                host: config.database.host,
                user: config.database.user,
                password: config.database.pass,
                port: config.database.port,
            });

            

            await conn.query("CREATE DATABASE `" + config.database.name + "` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;");
        } catch (error) {
            if (error.code == "ER_DB_CREATE_EXISTS") {
                
            } else {
                
                process.exit(0);
            }
        }


        // synchronize
        await database.sync();

    } catch (error) {
        
        console.log(error);
        process.exit(0);
    }
};
