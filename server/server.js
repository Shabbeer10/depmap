const fs = require('fs');
const http = require('http');
const url = require("url");
const hostname = '127.0.0.1';
const port = 3001;
const graphFile = 'graph.json';
let graphData = { nodes: [], edges: [] };

// For the Cytoscape graph
// Check if the graph file exists, if not create it with default structure
if (fs.existsSync(graphFile)) {
  graphData = JSON.parse(fs.readFileSync(graphFile, 'utf-8'));
} else {
  fs.writeFileSync(graphFile, JSON.stringify(graphData, null, 2));
}

let x = fs.readFileSync('users.json');
let y = fs.readFileSync('graph.json');

let graph = JSON.parse(y);
let users = JSON.parse(x);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  //before logged in
  if (parsedUrl.pathname === "/users") {
    switch (req.method) {
      case "GET":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(users));
        break;

      case "POST":
        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const data = JSON.parse(body);

// Check if the required fields are present
            if (!data.username) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing fields' }));
              return;
            }

// Specify the fields to write
            const newUser = {
              id: nextId++,
              username: data.username,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email || "n/a",
              password: data.password || "admin",
              phone: data.phone || "n/a",
              userStatus: data.userStatus || "inActive"
            };

            users.push(newUser);
            fs.writeFile("users.json", JSON.stringify(users, null, 2), err => {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to save user' }));
              } else {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(newUser));
              }
            });
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        break;

        //only for admin
      case "DELETE":
          let body1 = '';
          req.on('data', chunk => {
            body1 += chunk;
          });
          req.on('end', () => {
            const { userIds } = JSON.parse(body1); // array of user IDs
            users = users.filter(user => !userIds.includes(user.id));
            fs.writeFileSync('./users.json', JSON.stringify(users, null, 2));
            res.writeHead(204, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Users deleted' }));
        });
      break;
    }

    //When the user is logged in
    //change user -> {username}
  } else if (parsedUrl.pathname.startsWith("/users/")) {
    const id = parseInt(parsedUrl.pathname.split("/")[2], 10);
    const userIndex = users.findIndex(user => user.id === id);

    switch (req.method) {
      //User can Get their data only
      case "GET":
        if (userIndex !== -1) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(users[userIndex]));
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("User not found - GetById method");
        }
        break;
      //User can Update their data only
      case "PUT":
        let updateBody = "";
        req.on("data", chunk => {
          updateBody += chunk.toString();
        });
        req.on("end", () => {
          if (userIndex !== -1) {
            const updatedUser = { ...users[userIndex], ...JSON.parse(updateBody) };
            users[userIndex] = updatedUser;
            fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(users[userIndex]));
          } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("User not found - UpdateById");
          }
        });
        break;
      //User can Remove their data only
      case "DELETE":
        if (userIndex !== -1) {
          const deletedUser = users.splice(userIndex, 1);
          fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
          res.writeHead(204, { "Content-Type": "application/json" });
          res.end(JSON.stringify(deletedUser));
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("User not found - DeleteById");
        }
        break;

      default:
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("Method Not Allowed");
    }

}
// Node.js server for the Cytoscape graph
    else if (parsedUrl.pathname === "/graph" && req.method === "POST") {
    let body = "";

    req.on("data", chunk => {
        body += chunk.toString();
    });

    req.on("end", () => {
        try {
        const newContainer = JSON.parse(body);

        if (!newContainer.name || !Array.isArray(newContainer.node)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Missing 'name' or 'node' array" }));
        }

        const fileData = fs.readFileSync("graph.json", "utf-8");
        const parsedGraph = JSON.parse(fileData);
        const containers = parsedGraph.containers || [];

        // Find next available contId
        const existingIds = containers.map(c => c.contId);
        let contId = 1;
        while (existingIds.includes(contId)) contId++;

        const containerToAdd = {
            contId,
            name: newContainer.name,
            node: newContainer.node,
            edges: newContainer.edges || []
        };

        containers.push(containerToAdd);

        fs.writeFileSync("graph.json", JSON.stringify({ containers }, null, 2));

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(containerToAdd));

        } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON or malformed data" }));
        }
    });
    } 
    else if (parsedUrl.pathname.startsWith("/graph/")) {
    const containerId = parseInt(parsedUrl.pathname.split("/").pop());

    if (isNaN(containerId)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid container ID" }));
    }

    const fileData = fs.readFileSync("graph.json", "utf-8");
    const parsedGraph = JSON.parse(fileData);
    const containers = parsedGraph.containers || [];
    const index = containers.findIndex(c => c.contId === containerId);

    if (req.method === "GET") {
        if (index !== -1) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(containers[index]));
        } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Container not found" }));
        }

    } else if (req.method === "PUT") {
        let updateBody = "";
        req.on("data", chunk => {
        updateBody += chunk.toString();
        });
        req.on("end", () => {
        try {
            const updatedData = JSON.parse(updateBody);
            if (index === -1) {
            res.writeHead(404, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Container not found" }));
            }

            // Merge updates into the existing container
            containers[index] = {
            ...containers[index],
            ...updatedData,
            contId: containerId // Prevent contId overwrite
            };

            fs.writeFileSync("graph.json", JSON.stringify({ containers }, null, 2));
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(containers[index]));
        } catch (err) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
        });

    } else if (req.method === "DELETE") {
        if (index === -1) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Container not found" }));
        }

        const deleted = containers.splice(index, 1);
        fs.writeFileSync("graph.json", JSON.stringify({ containers }, null, 2));
        res.writeHead(204).end(); // No content

    } else {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("Method Not Allowed");
    }
    }


//   if the path does not match any of the above
  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(port, hostname, () => {
  console.log(`Server is running on http://${hostname}:${port}/`);
});
