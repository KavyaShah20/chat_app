import mongoose from "mongoose";

// console.log(process.env.MONGO_URI);

export const connect = () => {
    try {
        const conn = mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
    }
    catch (err) {
        console.error("Error connecting to MongoDB:", err);
    }   
};
