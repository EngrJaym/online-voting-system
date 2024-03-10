const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');

//Database Connection
const uri = "mongodb+srv://ocampojaym:onlinevotingsystem@cluster0.lkzwfqc.mongodb.net/URSM?retryWrites=true&w=majority";
mongoose.connect(uri).then(()=> console.log('Connected to Database!')).catch((error)=> console.log(error));


//Middleware
const homeRouter = require('./src/routes/homeRouter');
const ballotRouter = require('./src/routes/ballotRouter');
const adminRouter = require('./src/routes/adminRouter');
const { error } = require('console');

//Settings
app.set('views', './src/views');
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

//Routes
app.use('/', homeRouter);
app.use('/ballot', ballotRouter);
app.use('/admin', adminRouter);

const port = process.env.port || 5000;
app.listen(port, console.log(`Listening to port ${port}...`));