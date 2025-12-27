"use client";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with ReactFlow
const TreeChat = dynamic(() => import("../components/TreeChat"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#888",
      }}
    >
      Loading...
    </div>
  ),
});

const Home = () => {
  return <TreeChat />;
};

export default Home;
