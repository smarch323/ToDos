
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require("lodash");

const app = express();
const PORT = process.env.PORT || 3000; // online cyclic instructions




app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.set('strictQuery', false);
// mongoose.connect("mongodb+srv://smarch323:FallSean123@cluster0.0nanunf.mongodb.net/todolistDB");

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


//should have named itemsSchema
const itemSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({
  name: "Learn to Code"
});

const item2 = new Item({
  name: "For Realz, Learn to Code"
});

const item3 = new Item({
  name: "I'm being serious"
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemSchema]
});

const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  //find all returns an array (foundItems - defined here)
  Item.find({}, function(err, foundItems) {

    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Succesfully added to itemsDB");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems
      });
    }

  });
});

app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

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
    console.log('Listening on port $(PORT)')
  })
});
