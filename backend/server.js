const express=require("express")
const cors=require("cors")
const connectDB=require("./config/db")
require("dotenv").config()
const userRoutes=require("./routes/userRoutes")

const port=5550 || process.env.PORT

const app=express()

connectDB()

app.use(cors())
app.use(express.json())

app.use("/api/users",userRoutes)

app.listen(port,()=>{
    console.log(`Server is running on port ${port}` )
})