const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const router = require("./routes");
const config = require("./config/main");
const loaders = require("./loaders");
const app = express();
const server = http.createServer(app);

const startServer = async () => {
    //                
    app.use(express.static(path.join(__dirname, "public")));

    app.use(cors({ origin: "*" }));
    app.use(bodyParser.json({ limit: "10mb" }));
    app.use(bodyParser.urlencoded({ limit: "10mb", extended: false }));
    
    app.use(express.json()); // for parsing application/json  
    app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded  

    // main router
    app.use("/", router);

    // ejs engine
    app.set("views", path.join(__dirname, "./views"));
    app.set("view engine", "ejs");
    app.engine("html", require("ejs").renderFile);

    await loaders({ app });

    server.listen(config.port, () => {
        console.log(`server started on port ${config.port}`);
    });
};

startServer();

