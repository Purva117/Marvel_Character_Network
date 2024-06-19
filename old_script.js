// script.js

// Set up dimensions and margins
const width = document.getElementById("left-pane").clientWidth;
const height = document.getElementById("left-pane").clientHeight;

// Create SVG container and a group for the zoomable area
const svg = d3.select("#network").append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "#121212") // Dark theme background
    .call(d3.zoom().on("zoom", function(event) {
        g.attr("transform", event.transform);
    }))
    .append("g");

const g = svg.append("g");

// Load the data
d3.json("marvel_network_with_metrics.json").then(function(graph) {
    // Calculate node degrees (number of connections)
    const nodeDegree = {};
    graph.links.forEach(link => {
        nodeDegree[link.source] = (nodeDegree[link.source] || 0) + 1;
        nodeDegree[link.target] = (nodeDegree[link.target] || 0) + 1;
    });

    // Set up simulation
    const simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => Math.sqrt(nodeDegree[d.id] || 1) * 8));

    // Draw links (edges)
    const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-opacity", 0.6);

    // Draw nodes
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        .on("click", showNodeStats); // Show node stats on click

    node.append("circle")
        .attr("r", d => Math.sqrt(nodeDegree[d.id] || 1) * 4) // Set size based on degree
        .attr("fill", "#FF5722") // Modern color palette
        .on("mouseover", function(event, d) {
            d3.select(this).transition()
                .duration(150)
                .attr("r", Math.sqrt(nodeDegree[d.id] || 1) * 8) // Increase size on hover
                .attr("fill", "#FFAB91"); // Change color on hover
            d3.select(this.parentNode).select("text").style("visibility", "visible"); // Show text on hover
        })
        .on("mouseout", function(event, d) {
            d3.select(this).transition()
                .duration(150)
                .attr("r", Math.sqrt(nodeDegree[d.id] || 1) * 4) // Reset size on mouse out
                .attr("fill", "#FF5722"); // Reset color on mouse out
            d3.select(this.parentNode).select("text").style("visibility", "hidden"); // Hide text on mouse out
        });

    node.append("title")
        .text(d => d.id);

    node.append("text")
        .attr("x", 6)
        .attr("y", 3)
        .text(d => d.id)
        .style("visibility", "hidden"); // Hide text by default

    // Update simulation on each tick
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Stop simulation after it has stabilized
    simulation.alphaDecay(0.02).alphaMin(0.0001);

    // Drag functions
    const drag = simulation => {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    node.call(drag(simulation));

    // Display network stats
    displayNetworkStats(graph);
});

// Function to display network stats in the right pane
function displayNetworkStats(graph) {
    const numNodes = graph.nodes.length;
    const numLinks = graph.links.length;
    const averageDegree = (2 * numLinks) / numNodes;

    const stats = `
        <p>Number of Nodes: ${numNodes}</p>
        <p>Number of Links: ${numLinks}</p>
        <p>Average Degree: ${averageDegree.toFixed(2)}</p>
    `;

    document.getElementById("stats").innerHTML = stats;
}
