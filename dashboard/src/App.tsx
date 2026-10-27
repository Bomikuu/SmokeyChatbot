import { BusinessApp } from "@/features/business/BusinessApp";
import { WebsiteDashboard } from "@/features/sites/WebsiteDashboard";

const App = () =>
  window.location.pathname.startsWith("/websites") ? <WebsiteDashboard /> : <BusinessApp />;
export default App;
