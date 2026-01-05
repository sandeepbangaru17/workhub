import { BrowserRouter, Routes, Route } from "react-router-dom";
import Businesses from "./pages/Businesses";
import BusinessWorkers from "./pages/BusinessWorkers";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Businesses />} />
        <Route path="/businesses/:id" element={<BusinessWorkers />} />
      </Routes>
    </BrowserRouter>
  );
}
