module.exports = (sequelize, Sequelize) => {
    const Game = sequelize.define(
        "game",
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            gameCode: {
                type: Sequelize.STRING,
                defaultValue: "",
            },
            enName: {
                type: Sequelize.STRING,
                defaultValue: "",
            },
            payLines: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            banner: {
                type: Sequelize.STRING,
                defaultValue: "",
            },
            settings: {
                type: Sequelize.TEXT,
            },
            initPattern: {
                type: Sequelize.TEXT("medium"),
            },
            status: {
                type: Sequelize.TINYINT,
                allowNull: false,
                defaultValue: 1,
            },
            checked: {
                type: Sequelize.TINYINT,
                allowNull: false,
                defaultValue: 0,
            },
            memo: {
                type: Sequelize.STRING,
                defaultValue: "",
            },
        },
        {
            timestamps: true
        }
    );

    return Game;
};
