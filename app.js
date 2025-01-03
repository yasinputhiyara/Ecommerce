var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session')
const nocache = require('nocache')
const passport = require('./connection/passport')
const methodOverride = require('method-override');

const {checkBan} = require('./middleware/isBan')


var dotenv = require('dotenv')
dotenv.config();
var db = require('./connection/db')


var adminRouter = require('./routes/admin');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use((req,res,next)=>{
  res.set('cache-control' , 'no-store');
  next();
})

app.use(nocache())
app.use(
  session({
    secret:process.env.SESSION_SECRET, // Secret key used to sign the session ID cookie
    resave: false,            // Don't save session if unmodified
    saveUninitialized: true, // Don't create session until something is stored
    cookie: {
      secure:false,
      httpOnly:true,        
      maxAge: 60000 * 60
      } // Session expiration in milliseconds (e.g., 1 minute)
  })
);

app.use(passport.initialize());
app.use(passport.session())

app.use(checkBan)



app.use(methodOverride('_method'));



app.use('/admin', adminRouter);
app.use('/', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
