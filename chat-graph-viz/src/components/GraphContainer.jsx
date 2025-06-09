// DisplayGraph.jsx
import "@react-sigma/core/lib/style.css";
import { SigmaContainer } from '@react-sigma/core';
import LoadGraph from './LoadGraph';


function DisplayGraph({ processedData, onLegendReady }) {
  return (
    <SigmaContainer style={{ width: '100vw', height: '100vh' }}>
      <LoadGraph processedData={processedData} 
      onLegendReady={onLegendReady}
      />
    </SigmaContainer>
  );
}

export default DisplayGraph;
