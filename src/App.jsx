import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from './Components/Login';
import Dashboard from './Components/Dashboard';
import Testing from './Components/Testing';

export default function App() {
    return (
        <Router basename='/inventory'>
            <Routes>
                <Route path='/login' element={<Login />} />
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='/testing' element={<Testing />} />
                <Route path='*' element={<Login />} />
            </Routes>
        </Router>
    );
}
