const mongoose = require('mongoose')
const URL = "mongodb+srv://LeHuuDan99:5ZqLYinGk6PW6RwI@clustervegas.ym3zd.mongodb.net/?retryWrites=true&w=majority";
const connectDB = async () => {
  try {
    await mongoose.connect(
      URL,
      { useNewUrlParser: true, useUnifiedTopology: true }
    )
    console.log('Connected to mongoDB')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}
connectDB()
