export default function Logout() {
    const handleLogout = () => {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("user-logged-in")); // Reuse the same event
    };
  
    return (
      <button onClick={handleLogout} style={{ marginTop: "1rem" }}>
        Logout
      </button>
    );
  }
  