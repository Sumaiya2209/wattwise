import mongoose from "mongoose";
import { resilientDb } from "./mongodb";

// Better Auth er "user" collection (same database)
export const usersCol = () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db.collection("user");
  }
  return resilientDb.collection("user");
};