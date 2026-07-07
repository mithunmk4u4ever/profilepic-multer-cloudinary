import axios from "axios";
import { useEffect, useState } from "react";

// const API_URL = "http://localhost:5550/api/users";
const API_URL = import.meta.env.VITE_API_URL;
const getStoredAuth = () => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const storedUser = localStorage.getItem("user");

    return {
        accessToken,
        refreshToken,
        user: storedUser ? JSON.parse(storedUser) : null,
    };
};

const setStoredAuth = (data) => {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
};

const clearStoredAuth = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
};

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
                clearStoredAuth();
                return Promise.reject(error);
            }

            try {
                const response = await axios.post(`${API_URL}/refresh`, { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = response.data;

                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("refreshToken", newRefreshToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return api(originalRequest);
            } catch (refreshError) {
                clearStoredAuth();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

function App() {
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState("");
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadProfile = async () => {
        const { accessToken } = getStoredAuth();

        if (!accessToken) return;

        try {
            const response = await api.get("/me", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            setUser(response.data.user);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const { user: storedUser, accessToken } = getStoredAuth();

        if (storedUser && accessToken) {
            setUser(storedUser);
            loadProfile();
        }
    }, []);

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const endpoint = mode === "login" ? "/login" : "/register";
            const response = await api.post(endpoint, form);

            setStoredAuth(response.data);
            setUser(response.data.user);
            setMessage(response.data.message);
        } catch (error) {
            setMessage(error.response?.data?.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const { accessToken } = getStoredAuth();

        try {
            if (accessToken) {
                await api.post("/logout", {}, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            clearStoredAuth();
            setUser(null);
            setMessage("Logged out");
        }
    };

    const handleUpload = async () => {
        if (!image) {
            setMessage("Please choose an image first");
            return;
        }

        const { accessToken } = getStoredAuth();
        const formData = new FormData();
        formData.append("profile", image);

        try {
            const response = await api.put("/change-profile-picture", formData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            setMessage(response.data.message);
            await loadProfile();
        } catch (error) {
            setMessage(error.response?.data?.message || "Profile upload failed");
        }
    };

    return (
        <div style={{ maxWidth: "480px", margin: "40px auto", fontFamily: "sans-serif" }}>
            <h1>Cloudinary Profile App</h1>
            <p style={{ color: "#666" }}>
                {user ? `Signed in as ${user.name}` : "Register or login to manage your profile picture"}
            </p>

            {message && <p style={{ color: "#1d4ed8" }}>{message}</p>}

            {!user ? (
                <form onSubmit={handleAuthSubmit} style={{ display: "grid", gap: "10px" }}>
                    {mode === "register" && (
                        <input
                            type="text"
                            placeholder="Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    )}

                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setMode(mode === "login" ? "register" : "login");
                            setMessage("");
                        }}
                    >
                        Switch to {mode === "login" ? "Register" : "Login"}
                    </button>
                </form>
            ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                    <button onClick={handleLogout}>Logout</button>

                    <input type="file" onChange={(e) => setImage(e.target.files[0])} />

                    <button onClick={handleUpload}>Change Picture</button>

                    {user.profileImage?.url && (
                        <img
                            src={user.profileImage.url}
                            alt="Profile"
                            style={{ width: "220px", height: "220px", objectFit: "cover", borderRadius: "50%" }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default App;