import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import mongoose from "mongoose";
import session from 'express-session';
import passport from 'passport';
import passportlocalMongoose from "passport-local-mongoose";
import GoogleStrategy from "passport-google-oauth20";
GoogleStrategy.Strategy;
import FacebookStrategy from "passport-facebook";
FacebookStrategy.Strategy;
import findOrCreate from "mongoose-findorcreate";
// import bcrypt from "bcrypt";
// const saltRounds = 10;
//import md5 from "md5";
//import encrypt from "mongoose-encryption";

const app = express();
const port = process.env.PORT || 3030;
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://bpetznick:November211989@cluster0.nd9zxri.mongodb.net/userDB");

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportlocalMongoose);
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});
 
passport.deserializeUser(async function (id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-u6vj.onrender.com/auth/google/secrets",
    //userProfileURL: "http://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "https://secrets-u6vj.onrender.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req,res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] 
}));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});

app.get("/secrets", async function(req, res){
  try {
    const foundUsers = await User.find({"secret": {$ne:null}});
    if (foundUsers) {
      console.log(foundUsers);
      res.render("secrets", {usersWithSecrets: foundUsers});res.renderr
    }
  } catch(err) {
    console.log(err);
  }
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
} else {
    res.redirect("/login");
}
});

app.post("/submit", async function(req, res){
  const submittedSecret = req.body.secret
  try {
  const foundUser = await User.findById(req.user.id);
  if (foundUser){
    foundUser.secret = submittedSecret;
    foundUser.save();
    res.redirect("/secrets");
  }
  } catch(err) {
    console.log(err);
  }

});

app.get("/logout", function(req, res){
    req.logout(function(err){        
        if(err){            
                console.log(err);        
        }    
});
    res.redirect("/");
});

app.post("/register", function(req,res){
 
    User.register({username:req.body.username, active: false}, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req,res , function(){  
          res.redirect("/secrets");   
        })
      }
    });
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         //password: md5(req.body.password)
    //         password: hash
    //     });
    
    //     async function addUser() {
    //         try {
    //             await newUser.save();
    //             res.render("secrets");
    //         }  catch (err) {
    //             if (err){
    //                 console.log(err);
    //             } else {
    //             }
    //         }
    //     }
    //     addUser();
    // });

});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req,res , function(){  
                res.redirect("/secrets");
            });
        }
    });
    // const username = req.body.username;
    // //const password = md5(req.body.password);
    // const password = req.body.password;

    // async function findUser() {
    //     try {
    //         const foundUSer = await User.findOne({email: username});
    //         if (foundUSer) {
    //             //if (foundUSer.password === password){
    //                 bcrypt.compare(password, foundUSer.password, function(err, result) {
    //                     if (result === true) {
    //                         res.render("secrets");
    //                     }
    //                 })
    //             //}
    //         }
    //     }  catch (err) {
    //         if (err){
    //             console.log(err);
    //         } else {
    //         }
    //     }
    // }
    // findUser();
});

app.listen(port, function() {
    console.log("Server started on port"+port+".");
});