/**
 * MongoDB Connection Config with Mongoose Caching for Vercel Serverless Functions
 */

const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pico_picks';

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
            console.log('MongoDB connected successfully');
            return mongooseInstance;
        }).catch((err) => {
            console.error('MongoDB connection error:', err);
            cached.promise = null;
            throw err;
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = connectDB;
