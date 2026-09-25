import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import TicketList from "./pages/TicketList";
import CreateTicket from "./pages/CreateTicket";
import TicketDetails from "./pages/TicketDetails";
import EditTicket from "./pages/EditTicket";
import AssignmentRequests from "./pages/AssignmentRequests";
import AssignmentRequestManagement from "./pages/AssignmentRequestManagement";
import Agents from "./pages/Agents";
import AgentDetails from "./pages/AgentDetails";
import Profile from "./pages/Profile";
import AdminSettings from "./pages/AdminSettings";
import Notifications from "./pages/Notifications";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/tickets/:id/edit" element={<EditTicket />} />
        
        <Route path="/assignment-requests" element={<AssignmentRequests />}/>
        <Route path="/assignment-requests/manage" element={<AssignmentRequestManagement />}/>
        <Route path="/agents" element={<Agents />}/>
        <Route path="/agents/:id" element={<AgentDetails />}/>
        <Route path="/profile" element={<Profile />}/>
        <Route path="/admin-settings" element={ <ProtectedRoute> <AdminSettings /> </ProtectedRoute> } />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <TicketList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/new"
          element={
            <ProtectedRoute>
              <CreateTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <TicketDetails />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
