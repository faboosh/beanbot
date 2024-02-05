import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./routes/root";
import PrivacyPolicy from "./routes/privacy-policy";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
  },
  {
    path: "/privacy-policy",
    element: <PrivacyPolicy />,
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
