const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// 1. Initial State for 15 Devices (2 Fans, 3 Lights per room)
let officeState = {
  summary: {
    totalPowerWatts: 0,
    rooms: { drawing_room: 0, work_room_1: 0, work_room_2: 0 },
  },
  devices: [],
};

const rooms = ["drawing_room", "work_room_1", "work_room_2"];
const roomLabels = {
  drawing_room: "Drawing Room",
  work_room_1: "Work Room 1",
  work_room_2: "Work Room 2",
};

rooms.forEach((room) => {
  for (let i = 1; i <= 2; i++)
    officeState.devices.push(
      createDevice(`${room}_fan_${i}`, room, "fan", `Fan ${i}`, 60),
    );
  for (let i = 1; i <= 3; i++)
    officeState.devices.push(
      createDevice(`${room}_light_${i}`, room, "light", `Light ${i}`, 15),
    );
});

function createDevice(id, room, type, name, maxPower) {
  return {
    id,
    room,
    roomLabel: roomLabels[room],
    type,
    name,
    status: false,
    powerDraw: 0,
    maxPower,
    lastChanged: new Date().toISOString(),
  };
}

// Recalculate Power
function updateSummary() {
  let total = 0;
  let roomTotals = { drawing_room: 0, work_room_1: 0, work_room_2: 0 };

  officeState.devices.forEach((d) => {
    d.powerDraw = d.status ? d.maxPower : 0;
    total += d.powerDraw;
    roomTotals[d.room] += d.powerDraw;
  });

  officeState.summary.totalPowerWatts = total;
  officeState.summary.rooms = roomTotals;
}

// 2. Server-Sent Events (SSE) Setup for the Dashboard
let clients = [];

app.get("/api/office/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.push(res);
  res.write(`data: ${JSON.stringify(officeState)}\n\n`);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
  });
});

function broadcastState() {
  clients.forEach((client) =>
    client.write(`data: ${JSON.stringify(officeState)}\n\n`),
  );
}

// 3. REST Endpoints for the Discord Bot
app.get("/api/office/status", (req, res) => res.json(officeState));

app.get("/api/office/room/:roomId", (req, res) => {
  const roomData = officeState.devices.filter(
    (d) => d.room === req.params.roomId,
  );
  res.json({ roomLabel: roomLabels[req.params.roomId], devices: roomData });
});

// 4. The Dummy Data Simulator (Changes state every 5 seconds)
setInterval(() => {
  const randomDevice =
    officeState.devices[Math.floor(Math.random() * officeState.devices.length)];
  randomDevice.status = !randomDevice.status; // Toggle on/off
  randomDevice.lastChanged = new Date().toISOString();

  updateSummary();
  broadcastState(); // Push to dashboard immediately
  console.log(
    `[Simulator] Toggled ${randomDevice.name} in ${randomDevice.roomLabel} to ${randomDevice.status}`,
  );
}, 5000);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(
    `Tell Player 2 to connect EventSource to http://localhost:${PORT}/api/office/stream`,
  );
});
