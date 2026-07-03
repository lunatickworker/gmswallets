import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import UserApp from "./UserApp";
import AdminApp from "./AdminApp";
import { I18nProvider } from "../lib/i18n";

function useBranding() {
  useEffect(() => {
    document.title = "GSM Wallets";
    const link: HTMLLinkElement =
      document.querySelector("link[rel~='icon']") ||
      (() => {
        const el = document.createElement("link");
        el.rel = "icon";
        document.head.appendChild(el);
        return el;
      })();
    // Wallet emoji favicon rendered as SVG data URL
    link.href =
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💳</text></svg>";
    link.type = "image/svg+xml";
  }, []);
}

export default function App() {
  useBranding();
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
