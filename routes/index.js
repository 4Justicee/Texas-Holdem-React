const express = require("express");

const config = require("../config/main");
const router = express.Router();
const homeController = require("../controllers/home")
const multer  = require('multer');  
const upload = multer();
// routers

router.get("/",homeController.mainPage);

router.get("/503", homeController.gameMaintenance);
router.post("/fullstate/html5/play",upload.none(), homeController.gameService);


router.get("/gcs/api/v1/client/game_configs/:gameCode", (req, res)=>{
  res.send({"data":[],"statusCode":200});
})
router.post("/cdn-cgi/rum", (req, res)=>{
  res.status(200).send();
})
module.exports = router;


