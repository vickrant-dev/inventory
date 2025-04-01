import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const C_username = "steel";
    const C_password = "selva@1972";

    localStorage.setItem('username', C_username);

    const handleLogin = (e) => {
        e.preventDefault();

        if (username.trim() === C_username && password.trim() === C_password) {
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("loginTime", Date.now())
            navigate("/dashboard");
        } else {
            alert("Invalid Credentials");
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleLogin}>
                <label>
                    <p>Username</p>
                    <input type="text" placeholder='Username' value={username} onChange={(e) => setUsername(e.target.value)} />
                </label>
                <label>
                    <p>Password</p>
                    <input className='inputPass' type={showPassword ? "text" : "password"} placeholder='Password' value={password} onChange={(e) => setPassword(e.target.value)} />
                    <div className="show-password">
                        <input type='checkbox' onChange={() => setShowPassword(!showPassword)} />
                        <span>Show password</span>
                    </div>
                </label>
                <button type='submit'>Login</button>
            </form>
        </div>
    );
}
