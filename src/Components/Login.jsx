import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const C_username = "steel";
    const C_password = "22selva@1972";

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
        <div className="min-h-screen flex items-center justify-center bg-base-300 p-6">
            <div className="w-full max-w-md animate-fade-in relative">
                {/* Liquid Glass Container */}
                <div
                    className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20"
                    style={{
                        // subtle glossy shine using a pseudo element equivalent trick
                        boxShadow:
                            "inset 0 0 60px 30px rgba(255, 255, 255, 0.05), 0 10px 30px rgba(0, 0, 0, 0.2)",
                    }}
                >
                    <form
                        onSubmit={handleLogin}
                        className="space-y-6 relative z-10"
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-3">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    className="w-full px-4 py-4 bg-white/20 border border-white/30 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-3">
                                    Password
                                </label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-4 bg-white/20 border border-white/30 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />

                                <div className="flex items-center mt-4">
                                    <input
                                        type="checkbox"
                                        id="showPassword"
                                        className="w-4 h-4 text-primary bg-white/20 border-white/30 rounded focus:ring-primary/50"
                                        onChange={() =>
                                            setShowPassword(!showPassword)
                                        }
                                    />
                                    <label
                                        htmlFor="showPassword"
                                        className="ml-3 text-sm text-white/60 select-none"
                                    >
                                        Show password
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-2xl transition-transform duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
                        >
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
