const express = require("express");
const app = express();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
const admin = require("firebase-admin");
const { MongoClient } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();
const fileUpload = require("express-fileupload");
const SSLCommerzPayment = require("sslcommerz");
const { v4: uuidv4 } = require("uuid");

// middleWare
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));

var serviceAccount = require("./bilai-web-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l1zih.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
    if (req.headers?.authorization.startsWith("Bearer ")) {
        const token = req.headers.authorization.split(" ")[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        } catch { }
    }
    next();
}
async function run() {
    try {
        await client.connect();
        const database = client.db('biLaiProject');
        const appointmentsCollection = database.collection('appointments');
        const userCollection = database.collection('users');
        const ordersCollection = database.collection('orders');
        const blogCollection = database.collection('blogs');
        const paymentCollection = database.collection('payment');
        const productsCollection = database.collection('products')
        const doctorCollections = database.collection('doctors');
        const adoptationCollections = database.collection('adoptation');
        //sslcommerz init
        app.post('/init', async (req, res) => {

            const data = {
                total_amount: req.body.total_amount,
                currency: "BDT",
                tran_id: uuidv4(),
                success_url: "http://localhost:5000/success",
                fail_url: "http://localhost:5000/fail",
                cancel_url: "http://localhost:5000/cancel",
                ipn_url: "http://localhost:5000/ipn",
                shipping_method: "Courier",
                product_name: "cartItem",
                product_category: "Electronic",
                product_profile: "general",
                payment_status: "pending",
                cus_name: req.body.cus_name,
                cus_email: req.body.cus_email,
                purchase_date: req.body.date,
                uniqueID: req.body.uniqueID,
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: "Bangladesh",
                multi_card_name: "mastercard",
                value_a: "ref001_A",
                value_b: "ref002_B",
                value_c: "ref003_C",
                value_d: "ref004_D",
            };
            // console.log(data);
            const order = await paymentCollection.insertOne(data);
            const sslcommer = new SSLCommerzPayment(
                process.env.STORE_ID,
                process.env.STORE_PASS,
                false
            ); //true for live default false for sandbox
            sslcommer.init(data).then((data) => {
                //process the response that got from sslcommerz
                //https://developer.sslcommerz.com/doc/v4/#returned-parameters
                // console.log(data);
                if (data.GatewayPageURL) {
                    res.json(data.GatewayPageURL);
                } else {
                    return res.status(400).json({
                        message: "Payment Session Failed",
                    });
                }
            });
        });
        app.post("/success", async (req, res) => {
            // console.log(req.body);
            const order = await paymentCollection.updateOne(
                { tran_id: req.body.tran_id },
                {
                    $set: {
                        val_id: req.body.val_id,
                        payment_status: "Paid",

                    },
                }
            );

            res.status(200).redirect("http://localhost:3000/success");
        });
        app.post("/fail", async (req, res) => {
            // console.log(req.body);
            const order = await paymentCollection.deleteOne({
                tran_id: req.body.tran_id,
            });
            res.status(200).redirect("http://localhost:3000");
        });
        app.post("/cancel", async (req, res) => {
            // console.log(req.body);
            const order = await paymentCollection.deleteOne({
                tran_id: req.body.tran_id,
            });
            res.status(200).redirect("http://localhost:3000");
        });
        app.post("/ipn", async (req, res) => {
            // console.log(req.body);
            const order = await paymentCollection.deleteOne({
                tran_id: req.body.tran_id,
            });
            res.status(200).redirect("http://localhost:3000");
        });

        app.get("/purchase", async (req, res) => {
            const cursor = paymentCollection.find({});
            const paymnets = await cursor.toArray();
            res.send(paymnets);
        });
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });
        app.get("/orders/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = ordersCollection.find(query);
            const orders = await result.toArray();
            res.json(orders);
        });
        app.get('/orderDetails', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.json(orders);
        })
        app.get("/appointments", async (req, res) => {
            const email = req.query.email;
            // const date = new Date(req.query.date).toDateString();
            // console.log(date);
            const date = req.query.date;
            const query = { email: email, date: date };
            const cursor = appointmentsCollection.find(query);

            const appointments = await cursor.toArray();
            console.log(appointments);
            res.json(appointments);
        });

        app.get("/dashboard/allAppointment", async (req, res) => {
            const curosor = appointmentsCollection.find({});
            const allAppointments = await curosor.toArray();
            res.json(allAppointments);
        });
        app.get("/blogs", async (req, res) => {
            const curosor = blogCollection.find({});
            const allAppointments = await curosor.toArray();
            res.json(allAppointments);
        });
        app.get('/adoptions', async (req, res) => {
            const curosor = adoptationCollections.find({});
            const allAppointments = await curosor.toArray();
            res.json(allAppointments);
        })
        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            console.log(appointment);
            const result = await appointmentsCollection.insertOne(appointment);
            res.json(result);
        });
        app.post("/adoptations", async (req, res) => {
            const adoptaion = req.body;
            const result = await adoptationCollections.insertOne(adoptaion);
            res.json(result);
        })
        app.post('/products', async (req, res) => {
            const product = req.body;
            const products = {
                key: product.key,
                category: product.category,
                name: product.name,
                seller: product.seller,
                stock: product.stock,
                star: product.star,
                description: product.description,
                price: product.price,
                shipping: product.shipping,
                img: product.img
            }

            const result = await productsCollection.insertOne(products);
            res.json(result);
        });
        app.post("/blogs", async (req, res) => {
            // console.log('body', req.body);
            const blog = req.body;
            const pic = req.files.authoPic;
            const picture = req.files.blogPic;
            const picData = pic.data;
            const blogData = picture.data;
            const encodedPic = picData.toString("base64");
            const encodedBlogPic = blogData.toString("base64");
            const authorPicBuffer = Buffer.from(encodedPic, "base64");
            const blogPicBuffer = Buffer.from(encodedBlogPic, "base64");
            const blogs = {
                id: blog.id,
                category: blog.category,
                tag: blog.tag,
                date: blog.date,
                author: blog.author,
                title: blog.title,
                description: blog.description,
                block1: blog.block1,
                block2: blog.block2,
                block3: blog.block3,
                authorPic: authorPicBuffer,
                blogPic: blogPicBuffer,
            };
            const result = await blogCollection.insertOne(blogs);
            res.json(result);
        });

        app.put("/dashboard/allAppointment/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: "Approved",
                },
            };
            const result = await appointmentsCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            res.json(result);
        });

        app.delete("/appoitments/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await appointmentsCollection.deleteOne(query);
            res.json(result);
        });
        app.get("/allUser", async (req, res) => {
            const curosor = userCollection.find({});
            const allUser = await curosor.toArray();
            res.json(allUser);
        });
        app.get("/users/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === "admin") {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });

        app.get("/singleuser/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            // const cursor=userCollection.find()
            res.json(result);
        });

        app.post("/users", async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            // console.log(result);
            res.json(result);
        });
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });
        app.put("/users", async (req, res) => {
            const user = req.body;
            const filter = { emial: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await userCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            res.json(result);
        });
        app.put("/users/admin", verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await userCollection.findOne({
                    email: requester,
                });
                if (requesterAccount.role === "admin") {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: "admin" } };
                    const result = await userCollection.updateOne(
                        filter,
                        updateDoc
                    );
                    res.json(result);
                }
            } else {
                res.status(403).json({
                    message: "You Do Not Have Access to make Admin",
                });
            }
        });
        app.get("/doctors", async (req, res) => {
            const curosor = doctorCollections.find({});
            const allDoctor = await curosor.toArray();
            res.json(allDoctor);
        });
        app.post("/doctors", async (req, res) => {
            const doctor = req.body;
            const pic = req.files.imgUrl;
            const docData = pic.data;
            const encodedPic = docData.toString("base64");
            const doctorPicBuffer = Buffer.from(encodedPic, "base64");
            const doctors = {
                id: doctor.id,
                registrationNumber: doctor.registrationNumber,
                name: doctor.name,
                qualification: doctor.qualification,
                expertise: doctor.expertise,
                organization: doctor.organization,
                designation: doctor.designation,
                address: doctor.address,
                visitHour: doctor.visitHour,
                phone: doctor.phone,
                email: doctor.email,
                imgUrl: doctorPicBuffer,
            };
            const result = await doctorCollections.insertOne(doctors);
            res.json(result);
        });
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);
app.get("/", (req, res) => {
    res.send("Hello Folks!");
});

app.listen(port, () => {
    console.log(` app listening on port ${port}`);
});
