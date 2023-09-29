const express = require("express");
const app = express();
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwtk = require("jsonwebtoken");
const dbpath = path.join(__dirname, "twitterClone.db");
let db = null;
app.use(express.json());

const initers = async (request, response) => {
  db = await open({
    filename: dbpath,
    driver: sqlite3.Database,
  });
  app.listen(3000, () => {
    console.log("Running");
  });
};

initers();

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const haspassw = await bcrypt.hash(password, 10);
  const qur = `
    select * from user where username="${username}"
    `;
  const qre = await db.run(qur);
  if (qre === undefined) {
    const qurr = `
        insert into user (username,name,password,gender,location)
        values("${username}","${name}",'${haspassw}',"${gender}")
        `;
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const res = await db.run(qurr);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const qr = `
    select * from user where username="${username}"`;
  const ress = await db.get(qr);
  if (ress !== undefined) {
    const comp = bcrypt.compare(password, ress.password);
    if (comp) {
      // const payload = {
      //   username: username,
      // };
      const jwtok = jwtk.sign(ress, "SECRET_KEY");
      response.send({ jwtok });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  } else {
    response.status(400);
    response.send("Invalid User");
  }
});

const authenticate = async (request, response, next) => {
  const auth = request.headers["authorization"];
  let jwtt = "";
  if (auth === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  }
  if (auth !== undefined) {
    jwtt = auth.split(" ")[1];
  }
  jwtk.verify(jwtt, "SECRET_KEY", async (error, payload) => {
    if (error) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      request.payload = payload;
      next();
    }
  });
};

app.get("/user/tweets/feed/", authenticate, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(payload);
  //console.log(res.user_id);
  const qurey = `select username, tweet,date_time as dateTime from

 follower inner join tweet on follower.following_user_id= tweet.user_id inner join user on user.user_id=follower.following_user_oid

 

 where follower.follower_user_id=${user_id}

 order by date_time DESC

 limit 4

 `;

  const result = await db.all(qurey);

  response.send(result);
});

app.get("/user/following/", authenticate, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  const qu = `select name from user inner join  follower on user.user_id = follower.following_user_id where follower.follower_user_id=${user_id}`;
  const res = await db.all(qu);
  response.send(res);
});

app.get("/user/follower/", authenticate, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  const qu = `select name from user inner join  follower on user.user_id = follower.follower_user_id where follower.following_user_id=${user_id}`;
  const res = await db.all(qu);
  response.send(res);
});

app.get("/tweets/:tweetId/", authenticate, async (request, response) => {
  const { username, user_id } = request;
  const { tweetId } = request.params;
  const quer = `
select 
tweet as tweet,
(select count() from Like where tweet_id=${tweet_id}) as likes,
(select count() from reply where tweet_id=${tweet_id}) as replies,
date_time as dateTime
from tweet 
where tweet.tweet_id=${tweet_id}

`;

  const res = await db.get(quer);
  response.send(res);
});
app.get("/tweets/:tweetId/likes/", authenticate, async (request, response) => {
  const { tweetId } = request.params;
  const quer = `
select 
username from user inner join like on user.user_id=like.user_id
where tweet_id=${tweetId}

`;

  const res = await db.get(quer);
  const arra = res.map((each) => each.username);
  response.send({ likes: arra });
});

app.get(
  "/tweets/:tweetId/replies/",
  authenticate,
  async (request, response) => {
    const { tweetId } = request.params;
    const quer = `
select 
name , reply  from user inner join reply on user.user_id=reply.user_id
where tweet_id=${tweetId}

`;

    const res = await db.get(quer);
    const arra = res.map((each) => each.username);
    response.send({ replies: arra });
  }
);
app.get("/user/tweets/", authenticate, async (request, response) => {
  const { user_id } = request;

  const quer = `
select 
tweet ,
count(distinct like_id) as likes,
count(distinct reply_id) as replies,
date_time as dateTime

from tweet left join reply on tweet.tweet_id = reply.tweet_id left join on tweet.tweet_id = like.tweet_id
where tweet.user_id=${user_id} 
`;

  const res = await db.get(quer);
  response.send(res);
});

app.post("/user/tweets/", authenticate, async (request, response) => {
  const { user_id } = request;
  const { tweet } = request.body;
  const que = `
insert into tweet (tweet)
values("${tweet}") where user_id=${user_id}
`;
  const quu = await db.run(que);
  response.send("Created a Tweet");
});

app.delete("/tweets/:tweetId/", authenticate, async (request, response) => {
  const { tweetId } = request.params;
  const { user_id } = request;
  const quu = `
select * from tweet where user_id=${user_id} and tweet_id=${tweetId}

`;
  const res = await db.get(quu);
  if (res === undefined) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const q = ` delete from tweet where tweet_id=${tweetId}`;
    const req = await db.run(q);
    response.send("Tweet Removed");
  }
});
module.exports = app;
