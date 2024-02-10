const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

//Database Connection
const uri = "mongodb+srv://ocampojaym:onlinevotingsystem@cluster0.lkzwfqc.mongodb.net/URSM?retryWrites=true&w=majority";
mongoose.connect(uri).then(()=> console.log('Connected to Database!')).catch((error)=> console.log(error));


//Middleware
const homeRouter = require('./src/routes/homeRouter');
const ballotRouter = require('./src/routes/ballotRouter');
const electionRouter = require('./src/routes/electionRouter');
const { error } = require('console');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', homeRouter);
app.use('/ballot', ballotRouter);
app.use('/election', electionRouter);

app.set('views', './src/views');
app.set('view engine', 'ejs');


const port = process.env.port || 5000;
app.listen(port, console.log(`Listening to port ${port}...`));