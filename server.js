const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const mongourl = 'mongodb+srv://gg3be0:63360163@cluster0.0ijrh.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'test';
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const ObjectID = require('mongodb').ObjectID;
const mongo = require('mongodb');

const restSch = mongoose.Schema({
	"name": String,
	"cuisine": String,
	"borough": String,
	address:{
	"street": String,
	"building": String,
	"zipcode": Number,
	coord:{"lon": Number,
	       "lat": Number}
},
	img: {
		data: Buffer,
		contentType: String},
	grades:{
		user:String,
		score: Number},
	"owner":String
	});





const client = new MongoClient(mongourl, { useUnifiedTopology: true });

const insertDocument = (db, doc, callback) => {
    db.collection('rest').
    insertOne(doc, (err, result) => {
        assert.equal(err,null);
        console.log("inserted one document " + JSON.stringify(doc));
        callback(result,res);
    });
}




app.set('view engine','ejs');

const SECRETKEY = 'I want to pass COMPS381F';

var users = new Array(
	{name: 'developer', password: 'developer'},
	{name: 'demo', password: ''},
	{name:'student',password:''}
);

app.set('view engine','ejs');

app.use(session({
  name: 'loginSession',
  keys: [SECRETKEY]
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const findrestaurant = (db, criteria, callback) => {
    let cursor = db.collection('rests').find(criteria);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        callback(docs);
    });
}

const handle_show= (res,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        const db = client.db(dbName);
	
	let data = db.collection('rests').find()
	    data.toArray((err,docs)=>{
			assert.equal(err,null);
			client.close();
			res.render('list', {source: docs,username: req.session.username,criteria:JSON.stringify({})});

	});
    });
}




const handle_detail = (req,res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        const db = client.db(dbName);
        findrestaurant(db, criteria, (docs) => {
            client.close();
	    if(docs){	
			res.render('details', {source: docs,req:req});
		}else{
			res.status(404).end(criteria + ' not found!');
			}       
        });
    });
}




const handle_search = (res,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
		const db = client.db(dbName);
		let criteria = {};
		criteria[req.body.sortMethod] = req.body.sortValue;
		if(req.body.sortMethod && req.body.sortValue){
			findrestaurant(db, criteria, (docs) => {
				client.close();
			if(docs){
				res.render('list', {source: docs,username: req.session.username,criteria:JSON.stringify(criteria)});
			}
			});	
		}else{
			handle_show(res,req)
		}
			

    });
}
  
const handle_rate=(res,req)=>{
const client = new MongoClient(mongourl);
 
               client.connect((err) => {
                assert.equal(null, err);
                const db = client.db(dbName);
		console.log(req.body);
		console.log(res.body);
		console.log(req.query);
		console.log(res.query);
                let data = db.collection('rests').find(req.body.restaurant_id,{grades:{$elemMatch:{user:req.session.username}}});

                data.toArray((err,docs) => {
                assert.equal(err,null);
                client.close;
                });
                if(data != null) {
                    var ratedoc = {};
                    ratedoc['user'] = req.session.username;
                    ratedoc['score'] = req.body.score;
                    db.collection('rests').updateOne(req.query._id, {$push: {grades: ratedoc}})
                    console.log('rate success!');
                    res.status(200).end('create successful');
                }
                else {
                res.status(200).render('error',{});
                }
                });
}
app.post('/rate',(req,res)=>{
	handle_rate(res,req);
});

app.get('/read', (req,res)=> {
	handle_show(res,req);
});


app.get('/details', (req,res) => {
	if (req.query.id) {
		let criteria={};
		id = new mongo.ObjectID(req.query.id);
		criteria['_id']=id;
	     
            handle_detail(req,res,criteria,req);
	} else {
		res.status(404).end('NOT FOUND');
	}
});

app.get('/', (req,res) => {
	console.log(req.session);
	handle_show(req,res);
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		res.status(200).render('list',{source: docs,username: req.session.username,criteria:JSON.stringify({})});
	}
});

app.get('/login', (req,res) => {
	res.status(200).render('login',{});
});


app.post('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.body.name && user.password == req.body.password) {
			// correct user name + password
			// store the following name/value pairs in cookie session
			req.session.authenticated = true;        // 'authenticated': true
			req.session.username = req.body.name;	 // 'username': req.body.name		
		}
	});
	res.redirect('/read');
});

app.get('/logout', (req,res) => {
	req.session = null;   // clear cookie-session
	res.redirect('/');
});

app.get('/register',(req,res)=>{
	res.status(200).render('register',{})

});

app.post('/register',(req,res)=>{
	users.push({name:req.body.name,password:req.body.password});
	req.session.username= req.body.name;
});



app.use(multer({ dest: './uploads/', rename: function (fieldname, filename) {
	return filename;
	},
}));



app.get('/create',(req,res) => {
	res.status(200).render('create',{})
});

app.post('/create', function(req,res) {
	mongoose.connect(mongourl, {useNewUrlParser: true, useUnifiedTopology: true});
	let db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', (callback) => {
		const Rest = mongoose.model('rest', restSch);
		fs.readFile(req.files.img.path, (err,data) => {
		assert.equal(err,null);
		//var photo = new Buffer.from(data).toString('base64');		
		
		const obj = new Rest(
		{
		"name": req.body.name,
		"borough": req.body.borough,
		"cuisine": req.body.cuisine,
		"address":{	
			"street": req.body.street,
			"building": req.body.building,
			"zipcode": req.body.zipcode,
			"coord":{
				"lon": req.body.lon,
				"lat": req.body.lat,
				}
			},
		"img": {
			"data": Buffer.from(data).toString('base64'),
			"contentType": 'image/png'
			},
		"owner": req.session.username,
		"grades":{
			"user":"",
			"score":0
			}
                
		});
		obj.save((err) => {
			if (err) throw err 
			console.log('create successful!')
			db.close();
			res.status(200).end('create successful');
			});
		});
	});
});



app.post('/search', (req,res) => {
	handle_search(res,req);
	
});



app.get('/rate' , (req,res) => {
    res.status(200).render('rate',{});
});



app.get('/api/rests/name/:name', (req,res) => {
    if (req.params.name) {
        let criteria = {};
        criteria['name'] = req.params.name;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findrestaurant(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } 
})

app.get('/api/rests/borough/:borough', (req,res) => {
    if (req.params.borough) {
        let criteria = {};
        criteria['borough'] = req.params.borough;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findrestaurant(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } 
})

app.get('/api/rests/cuisine/:cuisine', (req,res) => {
    if (req.params.cuisine) {
        let criteria = {};
        criteria['cuisine'] = req.params.cuisine;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findrestaurant(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } 
})



app.listen(process.env.PORT || 8099);

