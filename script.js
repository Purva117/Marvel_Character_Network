const width = document.getElementById("left-pane").clientWidth;
const height = document.getElementById("left-pane").clientHeight;

const svg = d3.select("#network").append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "#282828")
    .call(d3.zoom().on("zoom", function(event) {
        g.attr("transform", event.transform);
    }))
    .append("g");

const g = svg.append("g");

d3.json("marvel_network_with_metrics_correlation.json").then(function(graph) {
    const nodeDegree = {};
    graph.nodes.forEach(node => {
        nodeDegree[node.id] = 0;
    });

    graph.links.forEach(link => {
        nodeDegree[link.source] += 1;
        nodeDegree[link.target] += 1;
    });

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
        .on("mouseover", showTooltip)
        .on("mouseout", hideTooltip)
        .on("click", selectNode);

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
            d3.select(this).transition()
                .duration(150)
                .attr("r", Math.sqrt(nodeDegree[d.id] || 1) * 4)
                .attr("fill", "#FF5722");
        });

    node.append("title").text(d => d.id);

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
        const htmlContent = `
            <strong>${d.id}</strong><br/>
            Degree: ${(d.degree_centrality ? d.degree_centrality.toFixed(2) : "N/A")}
        `;

        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(htmlContent)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }

    function hideTooltip() {
        tooltip.transition().duration(500).style("opacity", 0);
    }

    function selectNode(event, d) {
        d3.select("#character-name").text(d.id);
        d3.select("#centrality-stats").html(`
            <h3>Centrality Stats:</h3>
            <p>Degree: ${(d.degree_centrality ? d.degree_centrality.toFixed(2) : "N/A")}</p>
            <p>Betweenness Centrality: ${(d.betweenness_centrality ? d.betweenness_centrality.toFixed(2) : "N/A")}</p>
            <p>Closeness Centrality: ${(d.closeness_centrality ? d.closeness_centrality.toFixed(2) : "N/A")}</p>
        `);

        if (d.movies) {
            const moviesHtml = d.movies.map(movie => `
                <p>${movie.movie_name} (${movie.release_date})</p>
            `).join('');
            d3.select("#movies-list").html(`<h3>Movies:</h3>${moviesHtml}`);
        } else {
            d3.select("#movies-list").html("<p>No movies data available.</p>");
        }

        if (d.top_correlations) {
            const correlationsHtml = Object.entries(d.top_correlations)
                .map(([character, value]) => `<p>${character}: ${value.toFixed(2)}</p>`)
                .join('');
            d3.select("#correlations").html(`<h3>Top Correlated Characters:</h3>${correlationsHtml}`);
        } else {
            d3.select("#correlations").html("<p>No correlation data available.</p>");
        }

        tooltip.style("opacity", 0); // Hide tooltip when a node is selected
    }
});
