import { BrowserRouter, Routes, Route } from "react-router";
import UserApp from "./UserApp";
import AdminApp from "./AdminApp";
import { I18nProvider } from "../lib/i18n";

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*" element={<UserApp />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
