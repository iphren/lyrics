var express = require('express');
var path = require('path');
var logger = require('morgan');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);

var indexRouter = require('./routes/index');
var app = express();

app.set('trust proxy', 1);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

var settings = {
  store: new SQLiteStore,
  resave: false,
  saveUninitialized: false,
  secret: 'da85b688-1085-4c13-bfeb-456416fe0951',
  cookie: {
    httpOnly: false,
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
};
var sessionMiddleware = session(settings);
app.use(sessionMiddleware);
app.use('/', indexRouter);

module.exports = app;
