import { MotionConfig } from 'motion/react';
import { BrowserRouter, Route, Routes } from 'react-router';
import MenuPage from './pages/MenuPage';
import AdminPage from './pages/AdminPage';

// Define las rutas de la interfaz: el menú público en "/" y el panel en "/admin".
// MotionConfig desactiva las animaciones de movimiento para quien lo pide en su dispositivo.
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
