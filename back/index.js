import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: "http://bevsoft.com",
    methods: ["GET", "POST"],
  },
  path: "/socket2/"
});
const defaultState = () => {
  return [1,2,3].map((item) => {
    return {
      guessed: false,
      value: item*100
    }
  })
}
const categories = {
  anime: defaultState(),
  // geography: defaultState(),
  // gaming: defaultState(),
  // science: defaultState(),
  // random: defaultState(),
}

const questions = {  
  anime:
  [
    "anime1","anime2","anime3",
  ],
  geography: 
  [
    "anime1","anime2","anime3",
  ],
  gaming:
  [
    "anime1","anime2","anime3",
  ],
  science:
  [
    "anime1","anime2","anime3",
  ],
  random:
  [
    "anime1","anime2","anime3",
  ]
}
const answers = {  
  anime:
  [
    "answer1","answer2","answer3",
  ],
  geography: 
  [
    "answer1","answer2","answer3",
  ],
  gaming:
  [
    "answer1","answer2","answer3",
  ],
  science:
  [
    "answer1","answer2","answer3",
  ],
  random:
  [
    "answer1","answer2","answer3",
  ]
}
// list of connections per room
const connections = {

};
let activeGames = {};
const teamNames = ["Michelle", "Edana"]

//GAME VARS

io.on("connection", async (socket) => {
  socket.removeAllListeners("startGame");

  addConnection(socket, 0);
  const room = socket.handshake.auth.room;
  const username = socket.handshake.auth.username;
  socket.join(room);

  let rooms = io.sockets.adapter.rooms;
  console.log("the current connected clients are ", rooms);
  const teamSets = connections[room].teams;
  const players = Object.keys(connections[room]).filter(key=>key != "teams")
  const updatedTeams = [[...teamSets[0]], [...teamSets[1]]]
  socket.to(room).emit("playerJoined", username, updatedTeams);
  socket.emit("joinRoom", players, updatedTeams);

  socket.on("changeName", (oldName, newName, room, callback) => {
    console.log("changing name:", oldName, newName, callback);
    if (connections[room][newName]) {
      callback({
        status: "nameExists",
      });
    } else {
      connections[room][newName] = connections[room][oldName];
      delete connections[room][oldName];
      callback({
        status: "ok",
      });
      console.log("new room connections:", connections[room]);

      const teamSets = connections[room].teams;
      const updatedTeams = [[...teamSets[0]], [...teamSets[1]]]
      io.to(room).emit("changeTeam", updatedTeams);
      io.to(room).emit("playerLeft", oldName);
      io.to(room).emit("playerJoined", newName);
    }
  });

  socket.on("changeTeam", (name, team, room) => {
    console.log(`${name} is joining team ${1-team}`);
      connections[room][name].team = 1-team;
      connections[room].teams[team].delete(name)
      connections[room].teams[1-team].add(name)

    const teamSets = connections[room].teams;
      io.to(room).emit("changeTeam", [[...teamSets[0]], [...teamSets[1]]]);
      const updatedPlayerId = connections[room][name].playerId
      const newTeam = 1 - team;
      io.to(updatedPlayerId).emit("userUpdate", newTeam)
  });

  socket.on("disconnect", (reason) => {
    console.log(username +" disconnected, reason:" + reason);
    removeConnection(socket);
    const teamSets = connections[room].teams;
    for (const team of teamSets) {
      team.delete(username)
    }
    const updatedTeams = [[...teamSets[0]], [...teamSets[1]]]
    socket.to(room).emit("playerLeft", username, updatedTeams);
  });

  socket.on("startGame", () => {
    console.log(
      new Date(),
      "number of scoket listerned to startgame",
      socket.listenerCount("startGame")
    );

    const time = 10;
    console.log("startGame called by socket:", socket.id);
    if (!(room in activeGames)) {
      console.log("no active game currently");
      startGameLoop(io, room, time);
    } else {
      console.log("there is an active game currently");
    }
  });

  socket.on("stopGame", (room) => {
    stopGame(socket, room);
  });

  socket.on("chooseCategory", (category, amount) => {
    console.log("choosing category with activegames:", activeGames);
    if (activeGames[room] && activeGames[room]["stage"] == "chooseCategory") {
      activeGames[room]["category"] = category;
      activeGames[room]["amount"] = amount;
    }
  });
  socket.on("submitAnswer", (answer) => {
   console.log("submitting answer:", answer);
    if (activeGames[room]) {
      activeGames[room]["answer"] = answer;
    }
  });
  socket.on("buzzerPressed", () => {
    let buzzerWinnerId = connections[room][username].playerId
    console.log("playerid ", buzzerWinnerId)
    if (activeGames[room]["waitingForBuzzer"]) {
      activeGames[room]["waitingForBuzzer"] = false;
      activeGames[room]["buzzerWinner"] = username;
      console.log("buzzer pressed by ", username)
    }
  });

  if (!socket.recovered) {
    //console.log("we did not recover");
  }
});

server.listen(3001, () => {
  console.log("quiz at http://localhost:3001");
});

const getRandomSelection = (upperBound) => {
  return Math.floor(Math.random() * upperBound);
};
const getUnguessedQuestion = (state) => {

  for (const key of Object.keys(state)) {
    for (let question of [0,1,2]) {
      if (!state[key][question].guessed) {
        return [key, question]
      }
    }
  }
  return ["",0]
}

const startGameLoop = async (io, room) => {

  // assign players into two teams

  const teamSets = connections[room].teams;
  const players = Object.keys(connections[room]).filter(key=>key != "teams")
  console.log("all PLayers", players)
  let currentPlayer = players[0];
  //init game room
  activeGames[room] = {
    stage: "chooseCategory",
    state: categories,
    scores: [0,0],
    category: "",
    amount:  0,
    buzzerWinner: "",
    answer: ""
  };
  
  let guesses = 0;
  const timeLimit = 15;
  // Loop until all categories have been elected
  while (guesses < Object.keys(categories).length * 3) {
    activeGames[room].answer = ""
    io.to(room).emit("chooseCategory", activeGames[room].state, currentPlayer);
    
    // wait for the guesser to choose a category'\'s
    await waitForCondition(() => {
      return (activeGames[room]["category"] !== "");
    }, timeLimit);
    console.log("chooseCategory condition finished", activeGames[room].category);
    //select unguessed question
    let category;
    let questionNo
    if (activeGames[room].category === "") {
      [category, questionNo] = getUnguessedQuestion(activeGames[room]["state"])
    }
    category = activeGames[room].category;
    questionNo = activeGames[room].amount;
    const question = questions[category][questionNo];

    //start the buzzer phase
    io.to(room).emit("buzzer", activeGames[room]["category"], activeGames[room]["amount"], question);

    activeGames[room]["waitingForBuzzer"] = true;
    let answer = activeGames[room]["answer"];

    await waitForCondition(() => {
      return activeGames[room].buzzerWinner !== "";
    }, timeLimit);
    let buzzerWinner = activeGames[room]["buzzerWinner"];
    
    let buzzerWinnerId = connections[room][buzzerWinner].playerId
    let buzzerWinnerTeam = connections[room][buzzerWinner].team

    io.to(buzzerWinnerId).emit("guessAnswer", "question");
    io.to(room).except(buzzerWinnerId).emit("buzzerPressed", buzzerWinner);
    activeGames[room].buzzerWinner = "";

    await waitForCondition(() => {
      return activeGames[room]["answer"] !== "";
    }, timeLimit);
    answer = activeGames[room]["answer"];
    while (answer !== answers[category][questionNo]) {
      
      console.log("answer is ", answers[category][questionNo])
      io.to(room).emit("wrongAnswer", answer);
      console.log("answer is wrong")
      activeGames[room]["scores"][buzzerWinnerTeam] -= 50;
      io.to(room).emit("scoreChange", buzzerWinnerTeam, activeGames[room]["scores"][buzzerWinnerTeam])
      activeGames[room]["answer"] = ""
      io.to(room).emit("buzzer", activeGames[room]["category"], activeGames[room]["amount"]);
  
      activeGames[room]["waitingForBuzzer"] = true;
      await waitForCondition(() => {
        return activeGames[room]["buzzerWinner"] !== "";
      }, 1000);
      buzzerWinner = activeGames[room]["buzzerWinner"];
      buzzerWinnerId = connections[room][buzzerWinner].playerId
      io.to(buzzerWinnerId).emit("guessAnswer", "question");
      console.log("answer evenet sent to ", buzzerWinnerId)
      io.to(room).except(buzzerWinnerId).emit("buzzerPressed", buzzerWinner);
      activeGames[room][buzzerWinner] = "";
  
      await waitForCondition(() => {
        return activeGames[room].answer !== "";
      }, timeLimit);
      
      answer = activeGames[room].answer;
    }
    const questionData = activeGames[room]["state"][category][questionNo]
    questionData.guessed = true;

    activeGames[room]["scores"][buzzerWinnerTeam] += questionData.value;
    io.to(room).emit("scoreChange", buzzerWinnerTeam, activeGames[room]["scores"][buzzerWinnerTeam])
    //reset ganestate
    console.log("state", activeGames[room]["state"])
    activeGames[room]["category"] = ""
    activeGames[room]["amount"] = 0;
    
    //winner keeps picking next category
    currentPlayer = buzzerWinner
    guesses += 1;
  }
  
  const scores = activeGames[room]["scores"];
  io.to(room).emit("gameFinished", (scores));

  await new Promise((resolve) => setTimeout(() => resolve(), 5000));
  delete activeGames[room];
};

// check the condition every second up to timeoutSeconds 
function waitForCondition(checkCondition, timeoutSeconds = 10) {
  const timeout = timeoutSeconds * 1000;
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      // console.log("checking for condition ");
      if (checkCondition()) {
        clearInterval(intervalId);
        resolve("Condition met!");
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
      resolve("Timeout: Condition not met within the given time");
    }, timeout);
  });
}
// team defaults to 0
const addConnection = (socket, team = 0 ) => {
  console.log("adding connection to ", connections);
  const auth = socket.handshake.auth;
  const room = auth.room;
  if (!connections[room]) {
    connections[room] = {
      teams: [
        new Set(),
        new Set()
      ]
    };
  }
  connections[room][auth.username] = {
    playerId: socket.id,
    team: team,
    // pass through the joinroom function
    joinRoom: function (roomName) {
      socket.join(roomName);
    },
    leaveRoom: function (roomName) {
      socket.leave(roomName);
    },
  };
  connections[room]["teams"][team].add(auth.username)
  console.log(connections[room])
  // console.log("connections[room[",connections[room])
  // Object.keys(connections[room]).forEach(element => {
    
  //   console.log(connections[room][element].playerId)
  // });
};

const removeConnection = (socket) => {
  console.log("removing connection to ", connections);
  const auth = socket.handshake.auth;
  const username = socket.handshake.auth.username;
  const room = auth.room;

  if (connections[room]) {
    delete connections[room][username];
    if (Object.keys(connections[room]).length === 0) {
      delete connections[room]; // Clean up empty rooms
    }
  }
};
