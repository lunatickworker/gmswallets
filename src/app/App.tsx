import { BrowserRouter, Routes, Route } from "react-router";
import UserApp from "./UserApp";
import AdminApp from "./AdminApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<UserApp />} />
      </Routes>
    </BrowserRouter>
  );
}
