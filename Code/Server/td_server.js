//Required modules
var express = require('express');
var faye = require('faye');
var http = require('http');
var bodyParser = require('body-parser');
var nodemailer = require("nodemailer");
var moment = require("moment");
// Express und Server
var app = express();
var server = http.createServer(app);

// Verlinkung der Datenbank
var store = require('./store.js');

// Nodeadapter konfigurieren
// Nodeadapter zu http-Server hinzufügen
//PubSub-Client erzeugen
var bayeux = new faye.NodeAdapter({
	mount: '/faye',
	timeout: 45
});

bayeux.attach(server);
var pubClient = bayeux.getClient();

// Applikation konfigurieren
app.set('port', 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Errorhandler
app.use(function (err, req, res, next) {
	console.error(err.stack);
	res.writeHead(500);
	res.end(err.messages);
});

// create reusable transport method (opens pool of SMTP connections)
var transporter = nodemailer.createTransport("SMTP",{
  service: 'Gmail',
  auth: { user: 'vskueppers@gmail.com',
        pass: '' }
});

//--------------------------------------------------------------------------------------------------------------------------------------
var datum = new Date();
var aktuellesDatum = datum.getDate()+"-"+(datum.getMonth()+1)+"-"+datum.getFullYear();
var aktuelleUhrzeit = datum.getHours()+"-"+datum.getMinutes();
//--------------------------------------------------------------------------------------------------------------------------------------

//--------------------------------------------------------------------------------------------------------------------------------------
//---------------- Für die Website
//--------------------------------------------------------------------------------------------------------------------------------------
app.get('/', function(req, res){
    res.render('login');    
});
app.post('/', function(req, res){
    store.userLogin(req.body.benutzer, req.body.passwort, function(err, person){
        if (!person){
            res.status(400).send(err);
        }else{
            if(person.per_status == "Administrator"){
                console.log("Anmeldung Admin-Dashboard erfolgreich. Gebe ID "+person._id+" zurück.");
                console.log("Mitarbeiterstatus "+person.per_status);
                res.redirect('/home/'+person._id);
            }else{
                console.log("Anmeldung nicht erfolgreich.");
                console.log("Der Personenstatus muss Administrator sein und nicht "+person.per_status+"!");
                res.redirect('/');
            }
        }
    });
});
app.get('/home/:id', function(req, res){
    store.getPerson(req.params.id, function(err, person){
        if (!person){
            res.status(400).send(err);
        }else{
            res.render('home', {person:person});    
        }
    });
});
app.get('/home/:id/players', function(req, res){
    store.getPerson(req.params.id, function(err, person){
        if (!person){
            res.status(400).send(err);
        }else{
            store.getAllPlayers(person.per_mannschaft, function(err, players){
                if(err) {
                    res.writeHead(500, "Es ist ein Fehler aufgetreten");
                }else{
                    res.render('players', {person:person, players:players});    
                }
            });
        }
    });
});
app.post('/deletePlayer', function(req, res){
    var id = req.body.id;
    store.deletePlayer(req.body.spieler, function(err, spieler){
        if (!err){
            console.log('Spieler wurde gelöscht!');
            res.redirect('/home/'+id+'/players');
        }else{
            res.send('Kein Spieler mit dieser Kennung gefunden!', 400);
        }
    });
});
app.get('/home/:id/new_player', function(req, res){
    store.getPerson(req.params.id, function(err, person){
        if (!person){
            res.status(400).send(err);
        }else{
            res.render('newplayer', {person:person});    
        }
    });                   
});
app.post('/home/:id/new_player', function(req, res){
    var _id= req.params.id;
    var vorname= req.body.firstname;
    var name= req.body.lastname;
    
    store.addNewPlayer({
        per_mannschaft      : req.body.mannschaft,
        per_vorname         : req.body.firstname,
        per_name            : req.body.lastname,
        per_tel             : req.body.tel,
        per_mobil           : req.body.mobile,
        per_email           : req.body.email,
        per_status          : req.body.status,
        per_strasse         : req.body.street,
        per_stadt           : req.body.city,
        per_auto            : req.body.auto,
        per_sitzplaetze     : req.body.plaetze,
        per_benutzer        : req.body.user,
        per_pw              : req.body.pwd,
    }, function(err){
        if (err){
            res.status(400).send(err);
        }else{
            // setup e-mail data with unicode symbols
            var mailOptions = {
                from: "noreply <vskueppers@gmail.com>", // sender address
                to: email, // list of receivers
                subject: "TeamDrive - Sie wurden angemeldet", // Subject line
                html: "<b>Sie sind für TeamDrive registriert.</b><span>Ihr Trainer oder Ihr Betreuer hat Sie für TeamDrive freigeschaltet. Ihre Anmeldendaten sind Benutzername "+benutzer+"und das Passwort "+pw+" .</span>" // plaintext body
            }
            // send mail with defined transport objectre
            transporter.sendMail(mailOptions, function(error, response){
                if(error){
                    console.log(error);
                }else{
                    console.log("Mail gesendet: " + response.message);
                }
            });
            console.log("Spieler: "+vorname+" "+name+" wurde angelegt.");
            res.redirect('/home/'+_id+'/players');
        }
    });
});
app.get('/home/:id/events', function(req, res){
    store.getPerson(req.params.id, function(err, person){
        if (!person){
            res.status(400).send(err);
        }else{
            store.getAllEvents(person.per_mannschaft, function(err, events){
                if(err) {
                    res.writeHead(500, "Es ist ein Fehler aufgetreten");
                }else{
                    res.render('events', {person:person, events:events});    
                }
            });
        }
    });
});
app.post('/deleteEvent', function(req, res){
    var id = req.body.id;
    store.deleteEvent(req.body.event, function(err, event){
        if (!err){
            console.log('Event wurde gelöscht!');
            res.redirect('/home/'+id+'/events');
        }	else{
            res.send('Kein Event mit dieser ID gefunden!', 400);
        }
    });
});
app.get('/home/:id/new_event', function(req, res){
    store.getPerson(req.params.id, function(err, person){
        if (!person){
            res.status(400).send(err);
        }else{
            res.render('newevent', {person:person});    
        }
    });                   
});
app.post('/home/:id/new_event', function(req, res){
    var _id= req.params.id;
    var eventname= req.body.eventname;
    var date= req.body.date;
    var time= req.body.time;
    
    store.addNewEvent({
        e_mannschaft    : req.body.mannschaft,
        e_eventname     : req.body.eventname,
        e_gegner        : req.body.gegner,
        e_strasse       : req.body.street,
        e_stadt         : req.body.city,
        e_datum         : req.body.date,
        e_uhrzeit       : req.body.time,
        e_treffpunkt    : req.body.treff
    }, function(err){
        if (err){
            res.status(400).send(err);
        }else{
            console.log("Das Event "+eventname+" wurde für den "+date+" um "+time+" eingetragen.");
            res.redirect('/home/'+_id+'/events');
        }
    });
});
app.get('*', function(req, res){ 
    res.render('404');
});

//--------------------------------------------------------------------------------------------------------------------------------------
//---------------- Für die APP
//--------------------------------------------------------------------------------------------------------------------------------------
app.post('/login', function(req, res){
    var user = req.body.benutzer;
    var passwort = req.body.passwort;
    res.setHeader('Content-Type', 'application/json');
    store.userLogin(user, passwort, function(err, person){
        if (!person){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            store.getComingEvent(person._id, function(err, event){
                if (!event){
                    res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
                }else{
                    res.status(200).send({"state": 1, person:person, event:event});
                }
            });
        }
    });  
});
app.post('/register', function(req, res){
    var vorname= req.body.vorname;
    var name= req.body.nachname;

    res.setHeader('Content-Type', 'application/json');
    console.log("Spieler: "+vorname+" "+name+" wird angelegt.");
    store.addNewPlayer({
        per_mannschaft      : req.body.mannschaft,
        per_vorname         : req.body.vorname,
        per_name            : req.body.nachname,
        per_tel             : req.body.telefon,
        per_mobil           : req.body.mobile,
        per_email           : req.body.email,
        per_status          : req.body.status,
        per_strasse         : req.body.strasse,
        per_stadt           : req.body.stadt,
        per_auto            : req.body.auto,
        per_sitzplaetze     : req.body.sitzplaetze,
        per_benutzer        : req.body.benutzer,
        per_pw              : req.body.passwort,
    }, function(err){
        if (err){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            // setup e-mail data with unicode symbols
            var mailOptions = {
                from: "noreply <vskueppers@gmail.com>", 
                to: email, // list of receivers
                subject: "TeamDrive - Erfolgreich registriert",
                html: "<b>Sie haben sich auf TeamDrive registriert.</b><span>Ihre Anmeldendaten sind Benutzername "+benutzer+"und das Passwort "+pw+" .</span>" 
            }
            // send mail with defined transport objectre
            transporter.sendMail(mailOptions, function(error, response){
                if(error){
                    console.log(error);
                }else{
                    console.log("Mail wurde gesendet.");
                }
            });
            console.log("Spieler: "+vorname+" "+name+" wurde angelegt.");
            res.status(200).send(JSON.stringify({ "state": 1, "message" : "erfolgreich" }));
        }
    });
});

app.post('/fahrtmenue', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    store.getComingEvent(req.body.p_id, function(err, event){
        if (!event){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            res.status(200).send(JSON.stringify({ "state": 1, event:event}));
            //res.status(200).send(event);
        }
    });  
});
app.post('/fahrtauswahl', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    store.savePlayerStatus({
        pid     : req.body.p_id,
        eid     : req.body.e_id,
    }, req.body.status, function(err){
        if (err){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            res.status(200).send(JSON.stringify({ "state": 1, "message" : "erfolgreich" }));
        }
    });  
});
app.post('/getDriver', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    store.getEventDriver({
        mid     : req.body.p_id,
        eid     : req.body.e_id
    }, function(err, driver){
        if (!driver){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            res.status(200).send(JSON.stringify({ "state": 1, driver:driver}));
        }
    });  
});
app.post('/sendMessage', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    store.saveMessage({
        fid     : req.body.f_id,
        mid     : req.body.p_id,
        eid     : req.body.e_id,
        msg     : req.body.msg
    }, function(err){
        if (err){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            res.status(200).send(JSON.stringify({ "state": 1, "message" : "erfolgreich" }));
        }
    });  
});
app.post('/sendGPS', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    store.saveGPS({
        pid          : req.body.p_id,
        eid          : req.body.e_id,
        longitude    : req.body.longitude,
        latitude     : req.body.latitude
    }, function(err){
        if (err){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            res.status(200).send(JSON.stringify({ "state": 1, "message" : "erfolgreich" }));
        }
    });  
});
app.post('/auto', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    store.auto({
        fid          : req.body.f_id,
        mid          : req.body.m_id,
        eid          : req.body.e_id
    }, function(err){
        if (err){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            res.status(200).send(JSON.stringify({ "state": 1, "message" : "erfolgreich" }));
        }
    });  
});
app.post('/abfahrtzeitpunkt', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    store.getEventDestination(req.body.e_id, function(err, destination, treffpunkt){
        if (err){
            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
        }else{
            store.getDriverOrigin({pid:req.body.p_id, eid:req.body.e_id}, function(err, origin){
                if (err){
                    res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
                }else{
                    store.getNeededTime(origin, destination, function(err, time){
                        if (err){
                            res.status(400).send(JSON.stringify({ "state": 0, "message" : err }));
                        }else{
                            //var b = moment(time, "mm");
                            var abfahrt = moment(treffpunkt, "hh:mm").subtract(moment(time, "mm")).subtract(20, 'minute').format("hh:mm");
                            //c = moment(c, "hh:mm");
                            res.status(200).send(JSON.stringify({ "state": 1, abfahrt:abfahrt}));
                        }
                    });
                }
            });
        }
    }); 
});

//Start Server on Port
server.listen(3000, function () {
	console.log('Der Server wurde mit dem Port 3000 gestartet.');
});