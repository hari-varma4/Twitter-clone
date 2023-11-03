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
const getFollowingPeopleIdsOfUser = async (username) => {
  const getTheFollowingPeopleQuery = `

SELECT

following_user_id FROM follower

INNER JOIN user ON user.user_id = follower.follower_user_id

WHERE user.username='${username}';`;

  const followingPeople = await db.all(getTheFollowingPeopleQuery);

  const arrayOfIds = followingPeople.map(
    (eachUser) => eachUser.following_user_id
  );

  return arrayOfIds;
};
const authentication = (request, response, next) => {
  let jwtToken;

  const authHeader = request.headers["authorization"];

  if (authHeader) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken) {
    jwt.verify(jwtToken, "SECRET_KEY", (error, payload) => {
      if (error) {
        response.status(401);

        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;

        request.userId = payload.userId;

        next();
      }
    });
  } else {
    response.status(401);

    response.send("Invalid JWT Token");
  }
};

const tweetAccessVerification = async (request, response, next) => {
  const { userId } = request;

  const { tweetId } = request.params;

  const getTweetQuery = `SELECT *

FROM

tweet INNER JOIN follower ON tweet.user_id = follower.following_user_id

WHERE

tweet.tweet_id = '${tweetId}' AND follower_user_id='${userId}';`;

  const tweet = await db.get(getTweetQuery);

  if (tweet === undefined) {
    response.status(401);

    response.send("Invalid Request");
  } else {
    next();
  }
};

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;

  const qur = `
    select * from user where username="${username}";
    `;
  const qre = await db.get(qur);
  if (qre !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const haspassw = await bcrypt.hash(password, 10);
      const qurr = `
        insert into user (username,password,name,gender)
        values("${username}",'${haspassw}',"${name}","${gender}")
        `;
      const res = await db.run(qurr);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const qr = `
    select * from user where username="${username}"`;
  const ress = await db.get(qr);
  if (ress !== undefined) {
    const comp = await bcrypt.compare(password, ress.password);
    if (comp) {
      const payload = {
        username,
        userId: ress.user_id,
      };
      const jwToken = jwToken.sign(ress, "SECRET_KEY");
      response.send({ jwToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  } else {
    response.status(400);
    response.send("Invalid User");
  }
});

app.get("/user/tweets/feed/", authentication, async (request, response) => {
  const { username } = request;

  const followingPeopleIds = await getFollowingPeopleIdsOfUser(username);

  const getTweetsQuery = `SELECT username, tweet, date_time as dateTime

FROM user INNER JOIN tweet ON user.user_id = tweet.user_id

WHERE

user.user_id IN (${followingPeopleIds})

ORDER BY date_time DESC

LIMIT 4;`;

  const tweets = await db.all(getTweetsQuery);

  response.send(tweets);
});

app.get("/user/following/", authentication, async (request, response) => {
  const { username, userId } = request;

  const qu = `select name from follower inner join  user  on user.user_id = follower.following_user_id where follower.follower_user_id=${user_id};`;
  const res = await db.all(qu);
  response.send(res);
});

app.get("/user/follower/", authentication, async (request, response) => {
  const { username, userId } = request;
  const getFollowersQuery = `"SELECT DISTINCT name FROM follower INNER JOIN user ON user.user_id = follower.follower_user_id WHERE following_user_id='${userId}';`;

  const followers = await db.all(getFollowersQuery);
  response.send(followers);
});

app.get("/tweets/:tweetId/", authentication, async (request, response) => {
  const { username, user_id } = request;
  const { tweetId } = request.params;
  const quer = `
select 
tweet as tweet,
(select count() from Like where tweet_id='${tweet_id}') as likes,
(select count() from reply where tweet_id='${tweet_id}') as replies,
date_time as dateTime
from tweet 
where tweet.tweet_id='${tweet_id}';

`;

  const res = await db.get(quer);
  response.send(res);
});
8;
app.get(
  "/tweets/:tweetId/likes/",

  authentication,

  tweetAccessVerification,

  async (request, response) => {
    const { tweetId } = request.params;

    const getLikesQuery = `SELECT username

FROM user INNER JOIN like ON user.user_id= like.user_id

WHERE tweet_id = '${tweetId}'; `;

    const likedUsers = await db.all(getLikesQuery);

    const usersArray = likedUsers.map((eachUser) => eachUser.username);

    response.send({ likes: usersArray });
  }
);

app.get(
  "/tweets/:tweetId/replies/",
  authentication,
  tweetAccessVerification,
  async (request, response) => {
    const { tweetId } = request.params;
    const quer = `
select 
name , reply  from user inner join reply on user.user_id=reply.user_id
where tweet_id=${tweetId};

`;

    const res = await db.all(quer);

    response.send({ replies: res });
  }
);
app.get("/user/tweets/", authentication, async (request, response) => {
  const { user_id } = request;

  const quer = `
select 
tweet ,
count(distinct like_id) as likes,
count(distinct reply_id) as replies,
date_time as dateTime

from tweet left join reply on tweet.tweet_id = reply.tweet_id left join on tweet.tweet_id = like.tweet_id
where tweet.user_id=${user_id} 
group by tweet.tweet_id;
`;

  const res = await db.all(quer);
  response.send(res);
});

app.post("/user/tweets/", authentication, async (request, response) => {
  const { tweet } = request.body;

  const userId = parseInt(request.userId);

  const dateTime = new Date().toJSON().substring(0, 19).replace("T", " ");

  const createTweetQuery = `INSERT INTO tweet (tweet, user_id, date_time) VALUES ('${tweet}', '${userId}', '${dateTime}')`;

  await db.run(createTweetQuery);
  response.send("Created a Tweet");
});

app.delete("/tweets/:tweetId/", authentication, async (request, response) => {
  const { tweetId } = request.params;
  const { userid } = request;
  const quu = `
select * from tweet where user_id=${userid} and tweet_id=${tweetId}

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
