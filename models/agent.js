module.exports = (sequelize, Sequelize) => {
    const Agent = sequelize.define(
        "agent",
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            code: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: "",
            },
 
            currency: Sequelize.STRING,
            token: Sequelize.STRING,          
            
            agentEndpoint: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: "",
            },
        },
        {
            timestamps: true,
        }
    );

    return Agent;
};
