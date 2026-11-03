import mongoose from 'mongoose';

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error('Check that MongoDB is running and MONGO_URI in backend/.env is correct.');
    process.exit(1);
  }
}
