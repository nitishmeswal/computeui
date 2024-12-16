import mongoose from 'mongoose';
if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MONGODB_URI to .env');
}
// @ts-expect-error - no types for
let cached = global.mongoose;

if (!cached) {
    // @ts-expect-error - no types for
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect("mongodb+srv://dattaraj:neurolove@neurolov.8utoi.mongodb.net/?retryWrites=true&w=majority&appName=Neurolov");
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;