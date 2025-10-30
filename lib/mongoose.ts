import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) throw new Error("Please define MONGODB_URI in .env");

export const connectToDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  await mongoose.connect(uri, {
    dbName: "main",
  });

  console.log("MongoDB connected");
};