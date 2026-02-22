const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

const User = mongoose.model('SetupUser', userSchema, 'users');

const documentSchema = new mongoose.Schema({
    _id: String,
    data: Object,
    title: { type: String, default: 'Untitled Document' },
    owner: { type: String, required: true },
    collaborators: [{ type: String }],
    versions: [{
        data: Object,
        createdAt: { type: Date, default: Date.now }
    }],
    messages: [{
        text: String,
        sender: String,
        createdAt: { type: Date, default: Date.now }
    }]
});

const Document = mongoose.model('SetupDocument', documentSchema, 'documents');

async function setup() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    await mongoose.connection.db.dropDatabase();
    console.log('DB dropped.');

    const user = new User({
        username: 'shiva',
        email: 'shivakasula10@gmail.com',
        password: 'Shiva@9010'
    });
    await user.save();
    console.log('User created.');

    // Create the document with credentials printed inside
    const docId = Date.now().toString(); // unique ID
    const credentialsText = `Credentials:\nUsername: shiva\nEmail: shivakasula10@gmail.com\nPassword: Shiva@9010\n`;
    const delta = {
        ops: [{ insert: credentialsText }]
    };

    const doc = new Document({
        _id: docId,
        data: delta,
        title: 'first file',
        owner: 'shivakasula10@gmail.com',
        collaborators: [],
        versions: [],
        messages: []
    });
    await doc.save();
    console.log('Document created.');

    process.exit(0);
}

setup().catch(console.error);
