module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define(
        "user",
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            agentCode: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: "",
            },
            userCode: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: "",
            },
            token: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: "",
            },            
            balance: {
                type: Sequelize.DOUBLE(50, 2),
                allowNull: false,
                defaultValue: 0,
            },
            totalDebit: {
                type: Sequelize.DOUBLE(50, 2),
                allowNull: false,
                defaultValue: 0,
            },
            totalCredit: {
                type: Sequelize.DOUBLE(50, 2),
                allowNull: false,
                defaultValue: 0,
            },            
            lang: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: "en",
            },
            currency: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: "USD",
            },
            
        },
        {
            timestamps: true,
        }
    );

    User.prototype.setBalance = async function (debit, credit) {
        this.balance = agentResponse.userEndBalance;
        await this.save();
    };

    return User;
};
