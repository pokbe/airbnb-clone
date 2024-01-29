const mongoose = require('mongoose')

async function connect () {
    try {
        await mongoose.connect('mongodb://127.0.0.1/airbnb', {
            useNewUrlParser : true,
            useUnifiedTopology : true
        })
        console.log('Connected to MongoDB')
    } catch (error) {
        console.log("error")
        console.log(error.message)
    }
}

//这意味着在当前模块中，有一个 connect 的函数或对象被导出。这样，其他文件就可以使用 require 来加载这个模块，并获得 connect 函数或对象。
module.exports = {connect}