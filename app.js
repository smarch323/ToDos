
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require("lodash");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth2').Strategy;


const app = express();
const PORT = process.env.PORT || 3000; // online cyclic instructions


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());




mongoose.set('strictQuery', false);
// mongoose.connect(process.env.MONGO_URI);

// database connection for cyclic

const connectDB = async () => {
  try{
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected: " + conn.connection.host);
  } catch(error){
    console.log(error);
    process.exit(1);
  }
};

const userSchema = new mongoose.Schema({
  email: String,
  name : String,
  googleId: String,
  googleName: String,
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);


passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, {
      id: user.id,
      username: user.username,
      name: user.name
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

//Google
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  // callbackURL: "http://localhost:3000/auth/google/listlog",
  callbackURL: "https://cute-rose-gharial-slip.cyclic.app/"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOne({
    googleId: profile.id
  }).then((foundUser) => {
    if (foundUser) {
      return foundUser;
    } else {
      const newUser = new User({
        googleId: profile.id,
        googleName: profile.displayName,
      });
      return newUser.save();
    }
  }).then((user) => {
    return cb(null, user);
  }).catch((err) => {
    return cb(err);
  });
}
));

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"]
  }));

app.get("/auth/google/listlog",
  passport.authenticate("google", {
    failureRedirect: "/"
  }),
  function(req, res) {
let userPath = req.user.googleName;
    res.redirect("/" + userPath);
  });


  app.get("/logout", function(req, res) {
    req.logOut((err) => {});
    res.redirect("/");
  })

  
//should have named itemsSchema
const itemSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({
  name: "Learn to Code"
});

const item2 = new Item({
  name: "Play Basketball"
});

const item3 = new Item({
  name: "Attend All the Concerts"
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemSchema]
});

const List = mongoose.model("List", listSchema);


app.get("/", function(req, res) {
  res.render("home");
});

//OG Home List Page
// app.get("/", function(req, res) {

//   //find all returns an array (foundItems - defined here)
//   Item.find({}, function(err, foundItems) {

//     if (foundItems.length === 0) {
//       Item.insertMany(defaultItems, function(err) {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log("Succesfully added to itemsDB");
//         }
//       });
//       res.redirect("/");
//     } else {
//       res.render("list", {
//         listTitle: "Today",
//         newListItems: foundItems
//       });
//     }

//   });
// });

app.get("/:customListName", function(req, res) {
  const customListName = _.startCase(req.params.customListName);

  //returns object with findOne to search within listDB for entered url param
  List.findOne({
    name: customListName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        //create new list to add to list DB
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //show existing list and grab properties from object created by findOne retrieving from DB
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items
        });
      }
    }
  });
});


app.post("/", function(req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({
      name: listName
    }, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Deleted " + checkedItemId);
        res.redirect("/");
      }
    });
  } else {
    //need to find list where deletion is occurring (item within an array and remove entire item)
    // find, update, callback
    List.findOneAndUpdate({
      name: listName
    }, {
      $pull: {
        items: {
          _id: checkedItemId
        }
      }
    }, function(err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });

  }

});


// app.listen(3000, function() {
//   console.log("Server started on port 3000");
// });

//Recommended cyclic connection
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('Listening on port '  + PORT);
  })
});
