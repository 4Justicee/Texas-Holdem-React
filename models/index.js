
const Sequelize = require("sequelize");
const config = require("../config/main");

const sequelize = new Sequelize(config.database.name, config.database.user, config.database.pass, {
    host: config.database.host,
    dialect: config.database.type,
    port: config.database.port,
    logging: config.database.logging,
    pool: {
        max: 30, //              64          64             
        min: 0, //                                   
        acquire: 30000, //               (         )                        
        idle: 10000, //                                                                                (         )
    },
    timezone: "+09:00",
});

const db = {};
db.Agent = require("./agent")(sequelize, Sequelize);
db.User = require("./user")(sequelize, Sequelize);
db.Game = require("./game")(sequelize, Sequelize);

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.Op = Sequelize.Op;
db.sync = async () => {
    await db.sequelize.sync();

    Object.keys(db).forEach(async (modelName) => {
        if (db[modelName].associate) {
            await db[modelName].associate(db);
        }
    });
};

module.exports = db;
