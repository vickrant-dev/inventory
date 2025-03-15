import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from './Components/Login';
import Dashboard from './Components/Dashboard';

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path='/login' element={<Login />} />
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='*' element={<Login />} />
            </Routes>
        </Router>
    );
}
