import mongoose from "mongoose";

// Better Auth er "user" collection (same database)
export const usersCol = () => mongoose.connection.db!.collection("user");