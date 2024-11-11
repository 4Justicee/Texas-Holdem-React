
module.exports = async ({ app }) => {
    await require("./database")();
    await require("./request")();
    await require("./ws")();
};
