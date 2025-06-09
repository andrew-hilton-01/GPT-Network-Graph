import { useEffect, useRef } from "react";
import { useLoadGraph } from "@react-sigma/core";
import Graph from "graphology";
import { UMAP } from "umap-js";
import { colorForCluster } from "../utils/clusterColors";

// quick dumb stopword list
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "at",
  "by", "my", "you", "me", "it", "with", "that", "this", "i", "we", "your", "be", "can", "do", "from", "as", "but", "if", "so", "are", "was", "not"
]);

function getTopWords(msgs, n=3) {
  const counts = {};
  for (const text of msgs) {
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(w => w && !STOPWORDS.has(w) && w.length > 2)
      .forEach(w => { counts[w] = (counts[w] || 0) + 1; });
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w)
    .join(" · ");
}

// now accept onLegendReady as a prop
export default function LoadGraph({ processedData, onLegendReady }) {
  const loadGraph = useLoadGraph();
  const graphRef  = useRef(null);

  useEffect(() => {
    if (!processedData?.messages?.length) return;

    // ...build firstMsgByConvo, convos, clusters as before...
    const firstMsgByConvo = new Map();
    for (const m of processedData.messages) {
      const key = m.conversationId;
      if (!firstMsgByConvo.has(key) || m.timestamp < firstMsgByConvo.get(key).timestamp) {
        firstMsgByConvo.set(key, m);
      }
    }
    const convos = Array.from(firstMsgByConvo.values()).map(m => ({
      id:      m.conversationId,
      cluster: m.clusterId,
      label:   m.conversationTitle.slice(0, 60),
      emb:     m.embedding,
    }));
    const clusters = new Map();
    for (const c of convos) {
      if (!clusters.has(c.cluster)) clusters.set(c.cluster, { id: `cluster-${c.cluster}`, convos: [] });
      clusters.get(c.cluster).convos.push(c);
    }
    const nSamples   = convos.length;
    const nNeighbors = Math.min(10, nSamples - 1);

    const umap = new UMAP({
      nComponents: 2,
      nEpochs: 250,
      nNeighbors
    });
    const coords = umap.fit(convos.map(c => c.emb));
    convos.forEach((c, i) => { c.x = coords[i][0]; c.y = coords[i][1]; });
    clusters.forEach(cl => {
      const pts = cl.convos;
      const cx  = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy  = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      cl.x = cx;
      cl.y = cy;
    });

    /** --- LEGEND --- **/
    const legend = Array.from(clusters.values()).map(cl => {
      let clusterLabel = " ";
      let color = "#000000";
      if (cl.convos.length >= 2) {
        const texts = cl.convos.map(conv => conv.label || "");
        clusterLabel = getTopWords(texts, 3) || `cluster ${cl.id.split('-')[1]}`;
        color = colorForCluster(Number(cl.id.split('-')[1]));
      }
      return {
        id: cl.id,
        label: clusterLabel,
        color,
        count: cl.convos.length
      };
    });
    // call parent with legend
    if (onLegendReady) onLegendReady(legend);

    // ...build the graph as before...
    const graph = new Graph();

    clusters.forEach(cl => {
      let clusterLabel = " ";
      if (cl.convos.length >= 2) {
        const texts = cl.convos.map(conv => conv.label || "");
        clusterLabel = getTopWords(texts, 3) || `cluster ${cl.id.split('-')[1]}`;
      }
      graph.addNode(cl.id, {
        label: clusterLabel,
        size: cl.convos.length < 2 ? 1 : 5 + cl.convos.length * 0.3,
        color: cl.convos.length < 2 ? "#000000" : colorForCluster(Number(cl.id.split('-')[1]), { transparent: true }),
        x: cl.x,
        y: cl.y,
        kind: 'cluster',
      });
    });

    const outlierClusters = new Set(
      Array.from(clusters.values())
        .filter(cl => cl.convos.length < 2)
        .map(cl => cl.id)
    );
    convos.forEach(c => {
      const clusterNodeId = `cluster-${c.cluster}`;
      const isOutlier = outlierClusters.has(clusterNodeId);
      const color = isOutlier ? "#000000" : colorForCluster(c.cluster);

      graph.addNode(c.id, {
        label: c.label,
        size: 5,
        color,
        x: c.x,
        y: c.y,
        clusterId: c.cluster,
        kind: 'convo',
      });
      graph.addEdge(clusterNodeId, c.id, { color });
    });

    loadGraph(graph);
    graphRef.current = graph;
  }, [processedData, loadGraph, onLegendReady]);

  return null;
}
