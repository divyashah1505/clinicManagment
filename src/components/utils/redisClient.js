const { createClient } = require("redis")
const client = createClient({
    url: "redis://127.0.0.1:6379"
})
client.on("error", (err) => {
    console.log("redis client error", err);

})
async function connectReddis() {
    await client.connect();
    console.log("Redis Connected");

}
connectReddis();
module.exports = client