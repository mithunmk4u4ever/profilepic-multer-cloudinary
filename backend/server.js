const express=require("express")
const cors=require("cors")
const connectDB=require("./config/db")
require("dotenv").config()
const userRoutes=require("./routes/userRoutes")

const port = process.env.PORT || 5550

const app = express()

connectDB()

app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
}))
app.use(express.json())

app.use("/api/users",userRoutes)

app.listen(port,()=>{
    console.log(`Server is running on port ${port}` )
})