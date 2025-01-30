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
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
  },
  path: "/socket2/"
});
const defaultState = () => {
  return [1,2,3,4,5].map((item) => {
    return {
      guessed: false,
      value: item*100
    }
  })
}
const categories = {
  anime: defaultState(),
  geography: defaultState(),
  gaming: defaultState(),
}
// list of connections per room
const connections = {

};
let activeGames = {};
const teamNames = ["Michelle", "Edana"]
let baseTeams = [
  {
    name: teamNames[0],
    members: [],
    score: 0
  },
  {
    name: teamNames[1],
    members: [],
    score: 0
  }
]

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
  console.log("teamsets:, ", teamSets)
  const players = Object.keys(connections[room]).filter(key=>key != "teams")
  console.log()
  const updatedTeams = [[...teamSets[0]], [...teamSets[1]]]
  socket.to(room).emit("playerJoined", username, updatedTeams);
  socket.emit("joinRoom", players, updatedTeams);

  socket.on("changeName", (oldName, newName, room, callback) => {
    console.log("existing room connections:", connections[room]);
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
      console.log("new room connections:", connections[room]);

    const teamSets = connections[room].teams;
      io.to(room).emit("changeTeam", [[...teamSets[0]], [...teamSets[1]]]);
      const updatedPlayerId = connections[room][name].playerId
      const newTeam = 1 - team;
      io.to(updatedPlayerId).emit("userUpdate", newTeam)
  });

  socket.on("disconnect", (reason) => {
    console.log(username)
    console.log(reason + " disconnected");
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

  socket.on("chooseCategory", (category) => {
    console.log("choosing category with activegames:", activeGames);
    if (activeGames[room] && activeGames[room]["stage"] == "chooseCategory") {
      activeGames[room]["category"] = category;
    }
  });
  socket.on("submitAnswer", (answer) => {
    console.log("submitting answer with room:", room);
    if (activeGames[room]) {
      activeGames[room]["answer"] = answer;
    }
  });
  socket.on("buzzerPressed", () => {
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

const startGameLoop = async (io, room) => {

  // assign players into two teams
  let allPlayers = Object.entries(connections[room]);

  let currentPlayer = 0;
  activeGames[room]["gameState"] = categories;
  activeGames[room]["teams"] = baseTeams;
  
  let guesses = 0;
  // Loop until all categories have been elected
  while (guesses < 20) {
    io.to(room).emit("chooseCategory", activeGames[room]["gameState"], allPlayers[currentPlayer]);
    
    // wait for the guesser to choose a category'\'s
    await waitForCondition(() => {
      return (activeGames[room]["selection"] !== {});
    }, timeLimit);
    console.log("chooseCategory condition finished", activeGames[room]["selection"]);

    const category = activeGames[room]["selection"][0];
    const questionNo = activeGames[room]["selection"][1];
    const question = questions[category][questionNo];

    //start the buzzer phase
    io.to(room).emit("buzzer", question);

    let answer = activeGames[room]["answer"];

    await waitForCondition(() => {
      return activeGames[room]["buzzerWinner"] !== "";
    }, timeLimit);
    let buzzerWinner = activeGames[room]["buzzerWinner"];
    let buzzerWinnerId = connections[room]["buzzerWinner"].playerId
    let buzzerWinnerTeam = connections[room]["buzzerWinner"].team
    io.to(buzzerWinnerId).emit("submitAnswer", "question");
    io.to(room).except(buzzerWinnerId).emit("buzzerPressed", buzzerWinner);
    activeGames[room]["buzzerWinner"] = "";

    await waitForCondition(() => {
      return activeGames[room]["answer"] !== "";
    }, timeLimit);
    
    while (answer !== answers[category][questionNo]) {

      activeGames[room][teams][buzzerWinnerTeam] -= 50;
      io.to(room).emit("scoreChange", buzzerWinnerTeam, activeGames[room][teams][buzzerWinnerTeam])
      activeGames[room]["answer"] = ""
      io.to(room).emit("buzzer", question);
  
      await waitForCondition(() => {
        return activeGames[room]["buzzerWinner"] !== "";
      }, timeLimit);
      buzzerWinner = activeGames[room]["buzzerWinner"];
      buzzerWinnerId = connections[room]["buzzerWinner"].playerId
      
      io.to(buzzerWinnerId).emit("submitAnswer", "question");
      io.to(room).except(buzzerWinnerId).emit("buzzerPressed", buzzerWinner);
      activeGames[room]["buzzerWinner"] = "";
  
  
      await waitForCondition(() => {
        return activeGames[room]["answer"] !== "";
      }, timeLimit);
      
      answer = activeGames[room]["answer"];
      if (answer !== answers[category][questionNo]) {
        io.to(room).emit("buzzer", question);
  
        io.to(room).emit("wrongAnswer", "question");
        io.to(room).except(buzzerWinnerId).emit("buzzerPressed", buzzerWinner);
      }
    }
    const questionData = activeGames[room]["gameState"][category][questionNo]
    questionData.guessed = true;

    activeGames[room][teams][buzzerWinnerTeam] += questionData.value;
    io.to(room).emit("scoreChange", buzzerWinnerTeam, activeGames[room][teams][buzzerWinnerTeam])
    guesses += 1;
  }
  
  const scores = activeGames[room][teams].map(team => team.score)
  io.to(room).emit("gameFinished", (scores));

  await new Promise((resolve) => setTimeout(() => resolve(), 5000));
  
  delete activeGames[room];
};

// check the condition every second up to timeoutSeconds 
function waitForCondition(checkCondition, timeoutSeconds = 10) {
  const timeout = timeoutSeconds * 1000;
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      console.log("checking for condition ");
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
