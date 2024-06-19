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
        g.selectAll("text").attr("transform", event.transform.k > 1 ? `scale(${1/event.transform.k})` : `scale(1)`); // Scale text
    }))
    .append("g");

const g = svg.append("g");

// Load the data
d3.json("marvel_network_with_metrics.json").then(function(graph) {
    // Calculate centrality measures
    const nodeDegree = {};
    graph.nodes.forEach(node => {
        nodeDegree[node.id] = 0;
    });

    graph.links.forEach(link => {
        nodeDegree[link.source] += 1;
        nodeDegree[link.target] += 1;
    });

    let selectedNode = null; // Variable to keep track of the selected node

    // Set up simulation
    const simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => Math.sqrt(nodeDegree[d.id] || 1) * 8));

    const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-opacity", 0.6);

    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        .on("click", showNodeStats)
        .on("mouseover", showTooltip)
        .on("mouseout", hideTooltip);

    node.append("circle")
        .attr("r", d => Math.sqrt(nodeDegree[d.id] || 1) * 4)
        .attr("fill", "#FF5722")
        .on("mouseover", function(event, d) {
            d3.select(this).transition()
                .duration(150)
                .attr("r", Math.sqrt(nodeDegree[d.id] || 1) * 8)
                .attr("fill", "#FFAB91");
        })
        .on("mouseout", function(event, d) {
            if (selectedNode !== d) {
                d3.select(this).transition()
                    .duration(150)
                    .attr("r", Math.sqrt(nodeDegree[d.id] || 1) * 4)
                    .attr("fill", "#FF5722");
            }
        });

    node.append("title").text(d => d.id);

    node.append("text")
        .attr("x", 6)
        .attr("y", 3)
        .text(d => d.id);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    simulation.alphaDecay(0.02).alphaMin(0.0001);

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
    };

    node.call(drag(simulation));

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    function showTooltip(event, d) {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`<strong>${d.id}</strong><br/>
                      Degree: ${nodeDegree[d.id]}`)
            .style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px");
    }

    function hideTooltip() {
        tooltip.transition().duration(500).style("opacity", 0);
    }

    function showNodeStats(event, d) {
        if (selectedNode) {
            d3.select(`#node-${selectedNode.id} circle`).attr("fill", "#FF5722");
            d3.select(`#bar-${selectedNode.id}`).attr("fill", "#007bff");
        }
        selectedNode = d;
        d3.select(`#node-${d.id} circle`).attr("fill", "#FFD700");
        d3.select(`#bar-${d.id}`).attr("fill", "#FFD700");

        d3.select("#stats").html(`
            <h2>${d.id}</h2>
            <p>Degree: ${nodeDegree[d.id]}</p>
        `);
    }

    // Sort nodes by degree in descending order
    const sortedNodes = graph.nodes.sort((a, b) => nodeDegree[b.id] - nodeDegree[a.id]);

    const centralityChart = d3.select("#centrality-chart").append("svg")
        .attr("width", width * 0.3)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(20,20)");

    const x = d3.scaleLinear().domain([0, d3.max(Object.values(nodeDegree))]).range([0, width * 0.25]);
    const y = d3.scaleBand().domain(sortedNodes.map(d => d.id)).range([0, height - 40]).padding(0.1);

    const bars = centralityChart.selectAll(".bar")
        .data(sortedNodes)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("id", d => `bar-${d.id}`)
        .attr("x", 0)
        .attr("y", d => y(d.id))
        .attr("width", d => x(nodeDegree[d.id]))
        .attr("height", y.bandwidth())
        .attr("fill", "#007bff")
        .on("mouseover", function(event, d) {
            showTooltip(event, d);
            d3.select(this).attr("fill", "#ffab91");
        })
        .on("mouseout", function(event, d) {
            hideTooltip();
            if (selectedNode !== d) {
                d3.select(this).attr("fill", "#007bff");
            }
        })
        .on("click", showNodeStats);

    const labels = centralityChart.selectAll(".bar-text")
        .data(sortedNodes)
        .enter().append("text")
        .attr("class", "bar-text")
        .attr("x", d => x(nodeDegree[d.id]) + 5)
        .attr("y", d => y(d.id) + y.bandwidth() / 2)
        .text(d => nodeDegree[d.id]);
});
